// Password strength indicator bar

import { checkPasswordStrength } 
  from '../../utils/passwordUtils'

export default function StrengthBar({ 
  password, showLabel = true, showChecks = false 
}) {
  const strength = checkPasswordStrength(password)
  
  return (
    <div className="w-full">
      {/* 4 segment bar */}
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-full
              transition-all duration-300"
            style={{
              backgroundColor: i < strength.score
                ? strength.color
                : '#2A2A2A'
            }}
          />
        ))}
      </div>
      
      {/* Label */}
      {showLabel && password && (
        <p className="text-[12px] font-medium
          transition-colors duration-300"
          style={{ color: strength.color }}>
          {strength.label}
        </p>
      )}
      
      {/* Requirement checks */}
      {showChecks && password && (
        <div className="grid grid-cols-2 gap-1 mt-2">
          {[
            { key: 'length', label: '8+ characters' },
            { key: 'uppercase', label: 'Uppercase' },
            { key: 'lowercase', label: 'Lowercase' },
            { key: 'numbers',   label: 'Numbers' },
            { key: 'symbols',   label: 'Symbols' },
            { key: 'longLength',label: '16+ characters'},
          ].map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center gap-1.5"
            >
              <div className={`w-3.5 h-3.5 rounded-full
                flex items-center justify-center
                flex-shrink-0 transition-colors duration-200
                ${strength.checks[key]
                  ? 'bg-green-500/20'
                  : 'bg-[#252525]'
                }`}>
                {strength.checks[key] && (
                  <svg width="8" height="8" 
                    viewBox="0 0 8 8">
                    <path d="M1.5 4l2 2L6.5 2"
                      stroke="#22C55E" 
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      fill="none"/>
                  </svg>
                )}
              </div>
              <span className={`text-[11px] 
                transition-colors duration-200
                ${strength.checks[key]
                  ? 'text-[#888888]'
                  : 'text-[#444444]'
                }`}>
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
