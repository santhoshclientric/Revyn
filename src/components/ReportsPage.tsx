import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReportSelection } from './ReportSelection';
import { useAuth } from '../contexts/AuthContext';

interface StoredSelection {
  reportIds: string[];
  isBundle: boolean;
  timestamp: number;
}

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [isBundle, setIsBundle] = useState(false);

  // Check for stored selections on component mount and when user changes
  useEffect(() => {
    const storedSelection = localStorage.getItem('selectedReports');
    if (storedSelection && user) {
      try {
        const { reportIds, isBundle, timestamp }: StoredSelection = JSON.parse(storedSelection);
        
        // Check if selection is recent (within 1 hour)
        if (Date.now() - timestamp < 3600000) {
          setSelectedReportIds(reportIds);
          setIsBundle(isBundle);
          
          // Auto-proceed to payment if user is now logged in
          navigate('/payment', { 
            state: { 
              reportIds, 
              isBundle 
            } 
          });
          
          // Clear the stored selection
          localStorage.removeItem('selectedReports');
        } else {
          // Clear expired selection
          localStorage.removeItem('selectedReports');
        }
      } catch (error) {
        console.error('Error parsing stored selection:', error);
        localStorage.removeItem('selectedReports');
      }
    }
  }, [user, navigate]);

  // Clear stored selection on component unmount
  useEffect(() => {
    return () => {
      // Only clear if we successfully processed the selection
      if (user && selectedReportIds.length > 0) {
        localStorage.removeItem('selectedReports');
      }
    };
  }, [user, selectedReportIds]);

  const handleReportSelection = useCallback((reportIds: string[], bundle: boolean) => {
    console.log('handleReportSelection called with:', { reportIds, bundle, user: !!user });
    
    if (!user) {
      // Store selection before redirecting to login
      const selectionData: StoredSelection = {
        reportIds,
        isBundle: bundle,
        timestamp: Date.now()
      };
      localStorage.setItem('selectedReports', JSON.stringify(selectionData));
      console.log('Stored selection and navigating to login');
      navigate('/login');
      return;
    }
    
    // Clear any stored selection since user is logged in
    localStorage.removeItem('selectedReports');
    
    setSelectedReportIds(reportIds);
    setIsBundle(bundle);
    navigate('/payment', { 
      state: { 
        reportIds, 
        isBundle: bundle 
      } 
    });
  }, [user, navigate]);

  return (
    <div className="py-8">
      <ReportSelection 
        onSelectReports={handleReportSelection}
        user={user}
      />
    </div>
  );
};