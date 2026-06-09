// Pure CSS Payment Network Logos for VISA, MasterCard, Amex, UnionPay, and RuPay (offline render-safe).
import React from 'react'

export function NetworkLogo({ network, color, size = 'normal' }) {
  const s = size === 'small' ? 0.7 : 1

  if (network === 'visa') {
    return (
      <span style={{
        fontFamily: "'Times New Roman', serif",
        fontSize: Math.round(22 * s),
        fontWeight: 900,
        fontStyle: 'italic',
        color: color || '#FFFFFF',
        letterSpacing: '-1px',
        lineHeight: 1,
      }}>
        VISA
      </span>
    )
  }

  if (network === 'mastercard') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        width: Math.round(40 * s),
        height: Math.round(26 * s),
      }}>
        {/* Left circle - red */}
        <div style={{
          width: Math.round(26 * s),
          height: Math.round(26 * s),
          borderRadius: '50%',
          backgroundColor: '#EB001B',
          opacity: 0.95,
          position: 'absolute',
          left: 0,
        }} />
        {/* Right circle - orange/yellow */}
        <div style={{
          width: Math.round(26 * s),
          height: Math.round(26 * s),
          borderRadius: '50%',
          backgroundColor: '#F79E1B',
          opacity: 0.95,
          position: 'absolute',
          right: 0,
        }} />
        {/* Overlap - creates orange blend */}
        <div style={{
          width: Math.round(10 * s),
          height: Math.round(26 * s),
          backgroundColor: '#FF5F00',
          opacity: 0.9,
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          borderRadius: 2,
        }} />
      </div>
    )
  }

  if (network === 'amex') {
    return (
      <span style={{
        fontSize: Math.round(11 * s),
        fontWeight: 800,
        color: color || '#FFFFFF',
        letterSpacing: '0.15em',
        lineHeight: 1,
        textTransform: 'uppercase',
        border: `1.5px solid ${color || '#FFFFFF'}`,
        padding: `${Math.round(2 * s)}px ${Math.round(4 * s)}px`,
        borderRadius: 3,
      }}>
        AMEX
      </span>
    )
  }

  if (network === 'unionpay') {
    return (
      <div style={{ 
        display: 'flex', 
        gap: Math.round(2 * s) 
      }}>
        <div style={{
          width: Math.round(20 * s),
          height: Math.round(26 * s),
          borderRadius: Math.round(4 * s),
          background: 'linear-gradient(#CC0000, #990000)',
        }} />
        <div style={{
          width: Math.round(20 * s),
          height: Math.round(26 * s),
          borderRadius: Math.round(4 * s),
          background: 'linear-gradient(#CC0000, #990000)',
          opacity: 0.7,
        }} />
      </div>
    )
  }

  if (network === 'rupay') {
    return (
      <span style={{
        fontSize: Math.round(11 * s),
        fontWeight: 800,
        color: color || '#FFFFFF',
        letterSpacing: '0.1em',
        background: 'linear-gradient(135deg, #FF6600, #CC0000)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        RuPay
      </span>
    )
  }

  return null
}
