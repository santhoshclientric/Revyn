/*
  # Create purchases and report submissions tables

  1. New Tables
    - `purchases`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `report_ids` (text array)
      - `amount` (numeric)
      - `stripe_payment_id` (text)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `report_submissions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `purchase_id` (uuid, references purchases)
      - `report_type_id` (text)
      - `company_name` (text)
      - `email` (text)
      - `answers` (jsonb)
      - `status` (text)
      - `report_data` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for users to access their own data
*/

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_ids text[] NOT NULL,
  amount numeric NOT NULL,
  stripe_payment_id text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create report_submissions table
CREATE TABLE IF NOT EXISTS report_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  purchase_id uuid REFERENCES purchases(id) ON DELETE CASCADE NOT NULL,
  report_type_id text NOT NULL,
  company_name text NOT NULL,
  email text NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  report_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for purchases
CREATE POLICY "Users can read own purchases"
  ON purchases
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases"
  ON purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own purchases"
  ON purchases
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for report_submissions
CREATE POLICY "Users can read own submissions"
  ON report_submissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own submissions"
  ON report_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own submissions"
  ON report_submissions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS purchases_user_id_idx ON purchases(user_id);
CREATE INDEX IF NOT EXISTS purchases_created_at_idx ON purchases(created_at);
CREATE INDEX IF NOT EXISTS report_submissions_user_id_idx ON report_submissions(user_id);
CREATE INDEX IF NOT EXISTS report_submissions_purchase_id_idx ON report_submissions(purchase_id);
CREATE INDEX IF NOT EXISTS report_submissions_created_at_idx ON report_submissions(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_submissions_updated_at BEFORE UPDATE ON report_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();