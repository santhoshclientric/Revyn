import React, { useState, useMemo, useEffect } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface CheckboxPercentageInputProps {
  options: string[];
  value?: Record<string, number>;
  onChange: (value: Record<string, number>) => void;
  disabled?: boolean;
}

const CheckboxPercentageInput: React.FC<CheckboxPercentageInputProps> = ({
  options,
  value = {},
  onChange,
  disabled = false
}) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>(value);

  // Update internal state when value prop changes
  useEffect(() => {
    setSelectedOptions(value);
  }, [value]);

  // Calculate total percentage
  const totalPercentage = useMemo(() => {
    return Object.values(selectedOptions).reduce((sum, percentage) => sum + percentage, 0);
  }, [selectedOptions]);

  const handleOptionToggle = (option: string) => {
    if (disabled) return;

    const newSelections = { ...selectedOptions };
    
    if (option in newSelections) {
      // Remove option
      delete newSelections[option];
    } else {
      // Add option with default percentage
      const remainingPercentage = 100 - Object.values(newSelections).reduce((sum, val) => sum + val, 0);
      const selectedCount = Object.keys(newSelections).length;
      const defaultPercentage = selectedCount === 0 ? 100 : Math.max(0, remainingPercentage);
      
      newSelections[option] = defaultPercentage;
    }
    
    setSelectedOptions(newSelections);
    onChange(newSelections);
  };

  const handlePercentageChange = (option: string, percentage: number) => {
    if (disabled) return;

    const newSelections = { ...selectedOptions };
    newSelections[option] = Math.max(0, Math.min(100, percentage));
    
    setSelectedOptions(newSelections);
    onChange(newSelections);
  };

  const getStatusColor = () => {
    if (Math.abs(totalPercentage - 100) < 0.01) return 'text-green-600 bg-green-100';
    if (totalPercentage > 100) return 'text-red-600 bg-red-100';
    return 'text-yellow-600 bg-yellow-100';
  };

  const getStatusIcon = () => {
    if (Math.abs(totalPercentage - 100) < 0.01) return <CheckCircle className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const redistributePercentages = () => {
    if (disabled || Object.keys(selectedOptions).length === 0) return;

    const selectedKeys = Object.keys(selectedOptions);
    const equalPercentage = Math.floor(100 / selectedKeys.length);
    const remainder = 100 - (equalPercentage * selectedKeys.length);
    
    const newSelections: Record<string, number> = {};
    selectedKeys.forEach((key, index) => {
      newSelections[key] = equalPercentage + (index < remainder ? 1 : 0);
    });
    
    setSelectedOptions(newSelections);
    onChange(newSelections);
  };

  return (
    <div className="space-y-4">
      {/* Instructions - matching your form style */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-blue-800 text-sm">
          Select options and allocate percentages. Total must equal exactly 100%.
        </p>
      </div>

      {/* Total Progress Indicator */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-gray-900">Total:</span>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getStatusColor()}`}>
              {getStatusIcon()}
              <span className="font-bold text-sm">{totalPercentage.toFixed(1)}%</span>
            </div>
          </div>
          
          {Object.keys(selectedOptions).length > 1 && (
            <button
              onClick={redistributePercentages}
              disabled={disabled}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Distribute Equally
            </button>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              Math.abs(totalPercentage - 100) < 0.01 ? 'bg-green-500' :
              totalPercentage > 100 ? 'bg-red-500' :
              'bg-yellow-500'
            }`}
            style={{ width: `${Math.min(totalPercentage, 100)}%` }}
          />
        </div>
        
        {/* Status Message */}
        <div className="mt-2 text-xs">
          {Math.abs(totalPercentage - 100) < 0.01 ? (
            <span className="text-green-600 font-medium">✓ Perfect! Total equals 100%</span>
          ) : totalPercentage > 100 ? (
            <span className="text-red-600 font-medium">⚠️ Reduce by {(totalPercentage - 100).toFixed(1)}%</span>
          ) : (
            <span className="text-yellow-600 font-medium">📊 Need {(100 - totalPercentage).toFixed(1)}% more</span>
          )}
        </div>
      </div>

      {/* Options - matching your form style */}
      <div className="space-y-3 lg:space-y-4">
        {options.map((option, index) => {
          const isSelected = option in selectedOptions;
          const percentage = selectedOptions[option] || 0;
          
          return (
            <div
              key={index}
              className={`border-2 rounded-xl p-4 lg:p-5 transition-all duration-200 ${
                isSelected
                  ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 shadow-md'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-sm'
              }`}
            >
              {/* Option Header - matching your checkbox style */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => handleOptionToggle(option)}
                  disabled={disabled}
                  className="flex items-center flex-1 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className={`w-5 h-5 rounded border-2 mr-4 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <CheckCircle className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span className={`font-medium text-sm lg:text-base ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                    {option}
                  </span>
                </button>
                
                {isSelected && (
                  <div className="text-right">
                    <div className="text-xl font-bold text-blue-900">{percentage.toFixed(1)}%</div>
                  </div>
                )}
              </div>

              {/* Percentage Slider */}
              {isSelected && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-medium text-gray-600 w-6">0%</span>
                    <div className="flex-1 relative">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.1"
                        value={percentage}
                        onChange={(e) => handlePercentageChange(option, parseFloat(e.target.value))}
                        disabled={disabled}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed slider-thumb"
                        style={{
                          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 w-8">100%</span>
                  </div>
                  
                  {/* Number Input */}
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-medium text-gray-600">Exact:</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={percentage.toFixed(1)}
                      onChange={(e) => handlePercentageChange(option, parseFloat(e.target.value) || 0)}
                      disabled={disabled}
                      className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
        
        .slider-thumb::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default CheckboxPercentageInput;