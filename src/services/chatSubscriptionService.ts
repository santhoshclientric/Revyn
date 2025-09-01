// src/services/chatSubscriptionService.ts
import { supabase } from '../config/supabase';

export interface ChatSubscriptionData {
  userId: string;
  purchaseId: string;
  customerEmail: string;
  customerName: string;
}

export interface ChatSubscriptionStatus {
  hasActiveSubscription: boolean;
  subscriptionId?: string;
  currentPeriodEnd?: string;
  status?: string;
}

export class ChatSubscriptionService {
  private static instance: ChatSubscriptionService;
  private apiUrl: string = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  
  static getInstance(): ChatSubscriptionService {
    if (!ChatSubscriptionService.instance) {
      ChatSubscriptionService.instance = new ChatSubscriptionService();
    }
    return ChatSubscriptionService.instance;
  }

  /**
   * Create a recurring subscription for chat support
   */
  async createChatSubscription(data: ChatSubscriptionData): Promise<{ clientSecret: string; subscriptionId: string }> {
    try {
      console.log('Creating chat subscription:', data);
      const serverurl = import.meta.env.VITE_API_URL;
      const response = await fetch(`${serverurl}/api/create-chat-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: data.userId,
          purchaseId: data.purchaseId,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          priceAmount: 1000, // $10.00 in cents
          currency: 'usd'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Chat subscription created:', result);
      
      return {
        clientSecret: result.clientSecret,
        subscriptionId: result.subscriptionId
      };
    } catch (error) {
      console.error('Error creating chat subscription:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create chat subscription');
    }
  }

  /**
   * Check if user has an active chat subscription
   */
  async checkChatSubscriptionStatus(userId: string): Promise<ChatSubscriptionStatus> {
    try {
      const response = await fetch(`${this.apiUrl}/api/chat-subscription-status/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return { hasActiveSubscription: false };
    }
  }

  /**
   * Update subscription status after Stripe webhook
   */
  async updateSubscriptionStatus(
    subscriptionId: string, 
    status: string, 
    currentPeriodEnd: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('purchases')
        .update({
          chat_subscription_status: status,
          chat_subscription_end_date: currentPeriodEnd,
          chat_last_payment_date: status === 'active' ? new Date().toISOString() : undefined,
          updated_at: new Date().toISOString()
        })
        .eq('chat_stripe_subscription_id', subscriptionId);

      if (error) {
        throw error;
      }

      // Also update the chat_subscriptions table
      await supabase
        .from('chat_subscriptions')
        .update({
          status,
          current_period_end: currentPeriodEnd,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscriptionId);

    } catch (error) {
      console.error('Error updating subscription status:', error);
      throw error;
    }
  }

  /**
   * Cancel a chat subscription
   */
  async cancelChatSubscription(subscriptionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/api/cancel-chat-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // Update local database
      await this.updateSubscriptionStatus(subscriptionId, 'cancelled', new Date().toISOString());
      
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription history for a user
   */
  async getChatSubscriptionHistory(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('chat_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting subscription history:', error);
      return [];
    }
  }

  /**
   * Record successful subscription in database
   */
  async recordSubscription(
    userId: string,
    purchaseId: string,
    subscriptionId: string,
    currentPeriodStart: string,
    currentPeriodEnd: string
  ): Promise<void> {
    try {
      // Update purchases table
      const { error: purchaseError } = await supabase
        .from('purchases')
        .update({
          chat_subscription_status: 'active',
          chat_stripe_subscription_id: subscriptionId,
          chat_subscription_start_date: currentPeriodStart,
          chat_subscription_end_date: currentPeriodEnd,
          chat_last_payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', purchaseId)
        .eq('user_id', userId);

      if (purchaseError) {
        throw purchaseError;
      }

      // Insert into chat_subscriptions table
      const { error: subscriptionError } = await supabase
        .from('chat_subscriptions')
        .insert({
          user_id: userId,
          purchase_id: purchaseId,
          stripe_subscription_id: subscriptionId,
          status: 'active',
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd
        });

      if (subscriptionError) {
        throw subscriptionError;
      }

    } catch (error) {
      console.error('Error recording subscription:', error);
      throw error;
    }
  }
}