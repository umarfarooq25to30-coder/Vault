// App logo component representing the offline secure Vault icon drawn from the custom asset image.

import React from 'react';

export function VaultLogo({ className = 'w-6 h-6', ...props }) {
  return (
    <svg 
      viewBox="0 0 384 384" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <clipPath id="bdc1e83cb2">
          <path d="M 0 0.558594 L 384 0.558594 L 384 309.921875 L 0 309.921875 Z" clipRule="nonzero"/>
        </clipPath>
        <clipPath id="8c627f5ff7">
          <path d="M 9.316406 147.359375 L 374.746094 147.359375 L 374.746094 289.964844 L 9.316406 289.964844 Z" clipRule="nonzero"/>
        </clipPath>
        <clipPath id="0f9fcc0a4d">
          <path d="M 374.683594 289.964844 C 374.683594 212.289062 291.503906 147.359375 192 147.359375 C 92.496094 147.359375 9.316406 212.289062 9.316406 289.964844 Z" clipRule="nonzero"/>
        </clipPath>
        <clipPath id="8d97d83b33">
          <path d="M 0.316406 0.359375 L 365.746094 0.359375 L 365.746094 142.964844 L 0.316406 142.964844 Z" clipRule="nonzero"/>
        </clipPath>
        <clipPath id="8d5dfd4e7f">
          <path d="M 365.683594 142.964844 C 365.683594 65.289062 282.503906 0.359375 183 0.359375 C 83.496094 0.359375 0.316406 65.289062 0.316406 142.964844 Z" clipRule="nonzero"/>
        </clipPath>
        <clipPath id="cc3389efa1">
          <rect x="0" width="366" y="0" height="143"/>
        </clipPath>
        <clipPath id="5a5b78cd86">
          <path d="M 36 0.558594 L 221 0.558594 L 221 136 L 36 136 Z" clipRule="nonzero"/>
        </clipPath>
        <clipPath id="65e51b4825">
          <rect x="0" width="384" y="0" height="310"/>
        </clipPath>
      </defs>
      <g transform="matrix(1, 0, 0, 1, 0, 40)">
        <g clipPath="url(#65e51b4825)">
          <g clipPath="url(#bdc1e83cb2)">
            <path 
              strokeLinecap="butt" 
              transform="matrix(2.223297, 0, 0, 2.223297, 4.870476, 14.035965)" 
              fill="none" 
              strokeLinejoin="miter" 
              d="M 1.999702 124.107991 L 1.999702 36.999521 C 1.999702 17.669413 17.670055 2.000817 37.000162 2.000817 L 131.335022 2.000817 C 150.665129 2.000817 166.335482 17.669413 166.335482 36.999521 L 166.335482 124.107991" 
              stroke="currentColor" 
              strokeWidth="4" 
              strokeOpacity="1" 
              strokeMiterlimit="4"
            />
          </g>
          <g clipPath="url(#8c627f5ff7)">
            <g clipPath="url(#0f9fcc0a4d)">
              <g transform="matrix(1, 0, 0, 1, 9, 147)">
                <g clipPath="url(#cc3389efa1)">
                  <g clipPath="url(#8d97d83b33)">
                    <g clipPath="url(#8d5dfd4e7f)">
                      <path 
                        fill="currentColor" 
                        d="M 0.316406 0.359375 L 365.746094 0.359375 L 365.746094 142.964844 L 0.316406 142.964844 Z" 
                        fillOpacity="1" 
                        fillRule="nonzero"
                      />
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </g>
          <g clipPath="url(#5a5b78cd86)">
            <path 
              strokeLinecap="butt" 
              transform="matrix(2.223297, 0, 0, 2.223297, 82.598357, 45.058921)" 
              fill="none" 
              strokeLinejoin="miter" 
              d="M 1.721508 17.994668 C 14.352316 -3.331349 26.983123 -3.331349 39.61393 17.994668" 
              stroke="currentColor" 
              strokeWidth="4" 
              strokeOpacity="1" 
              strokeMiterlimit="4"
            />
          </g>
          <path 
            strokeLinecap="butt" 
            transform="matrix(2.223297, 0, 0, 2.223297, 208.608521, 59.488995)" 
            fill="none" 
            strokeLinejoin="miter" 
            d="M 1.506101 12.829023 C 14.136909 -1.609699 26.767716 -1.609699 39.398523 12.829023" 
            stroke="currentColor" 
            strokeWidth="4" 
            strokeOpacity="1" 
            strokeMiterlimit="4"
          />
        </g>
      </g>
    </svg>
  );
}

export default VaultLogo;
