// 3D Tilt Card Visualizer supporting realistic layouts, patterns, brand styles, EMV chips, and touch responsiveness.

import { useState, useRef, useCallback, useEffect } from 'react'
import { BANK_CARD_STYLES } from '../../utils/cardStyles'
import { NetworkLogo } from './NetworkLogo'
import {
  detectCardType,
  maskCardNumber,
  isCardExpired,
} from '../../utils/cardUtils'

export default function CardVisual({
  card,
  showFull = false,
  showCVV = false,
  size = 'normal',
  enable3D = true,
}) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const [isFlipped, setIsFlipped] = useState(false)
  const cardRef = useRef(null)

  useEffect(() => {
    if (showCVV) {
      setIsFlipped(true)
    } else if (showFull) {
      setIsFlipped(false)
    }
  }, [showCVV, showFull])

  const style = BANK_CARD_STYLES.find(
    s => s.id === (card?.colorId || 'custom-black')
  ) || BANK_CARD_STYLES[0]

  const cardType = detectCardType(card?.cardNumber || '')

  const isSmall = size === 'small'
  const W = isSmall ? 260 : 380
  const H = isSmall ? 160 : 234

  // ── 3D MOUSE HANDLERS ──────────────────────────

  const handleMouseMove = useCallback((e) => {
    if (!enable3D || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const rotY = ((e.clientX - centerX) / (rect.width / 2)) * 15
    const rotX = -((e.clientY - centerY) / (rect.height / 2)) * 10
    setRotation({ x: rotX, y: rotY })
  }, [enable3D])

  const handleMouseLeave = useCallback(() => {
    setRotation({ x: 0, y: 0 })
  }, [])

  // ── TOUCH 3D HANDLERS ─────────────────────────

  const handleTouchMove = useCallback((e) => {
    if (!enable3D || !cardRef.current) return
    const touch = e.touches[0]
    const rect = cardRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const rotY = ((touch.clientX - centerX) / (rect.width / 2)) * 12
    const rotX = -((touch.clientY - centerY) / (rect.height / 2)) * 8
    setRotation({ x: rotX, y: rotY })
  }, [enable3D])

  const handleTouchEnd = useCallback(() => {
    setRotation({ x: 0, y: 0 })
  }, [])

  const displayNumber = showFull
    ? (card?.cardNumber || '•••• •••• •••• ••••')
    : maskCardNumber(card?.cardNumber || '', cardType)

  const expired = isCardExpired(card?.expiry || '')

  // ── CARD FACE COMPONENT ───────────────────────

  const CardFront = () => (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backfaceVisibility: 'hidden',
      WebkitBackfaceVisibility: 'hidden',
      borderRadius: 16,
      overflow: 'hidden',
      background: style.bg,
      transform: 'rotateY(0deg)',
      transformStyle: 'preserve-3d',
    }}>
      {/* Texture pattern overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: style.pattern,
        borderRadius: 16,
      }} />

      {/* Shimmer highlight */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(
          ellipse at ${50 + rotation.y * 2}% ${50 - rotation.x * 2}%,
          ${style.shimmer} 0%,
          transparent 60%
        )`,
        borderRadius: 16,
        transition: 'background 0.1s ease',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: isSmall ? 16 : 24,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
      }}>
        {/* TOP ROW */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <span style={{
            fontSize: isSmall ? 11 : 13,
            fontWeight: 700,
            color: style.textColor,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            maxWidth: '55%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            opacity: 0.95,
          }}>
            {style.bank || card?.bankName || 'VAULT CARD'}
          </span>

          {/* Network logo */}
          <NetworkLogo
            network={style.network !== 'other' ? style.network : cardType}
            color={style.textColor}
            size={isSmall ? 'small' : 'normal'}
          />
        </div>

        {/* CHIP + CONTACTLESS */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          {/* EMV Chip */}
          <div style={{
            width: isSmall ? 30 : 42,
            height: isSmall ? 22 : 30,
            borderRadius: 5,
            background: 'linear-gradient(135deg, #D4AF37, #FFE066, #C8942A)',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(3, 1fr)',
            gap: 1.5,
            padding: 4,
            boxSizing: 'border-box',
            flexShrink: 0,
          }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{
                background: i === 4 ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.2)',
                borderRadius: 1,
              }} />
            ))}
          </div>

          {/* Contactless symbol */}
          <div style={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
          }}>
            {[3, 5, 7].map((sVal, i) => (
              <div key={i} style={{
                width: sVal,
                height: sVal,
                borderRadius: '50%',
                border: `1.5px solid ${style.textColor}`,
                opacity: 0.5,
              }} />
            ))}
          </div>
        </div>

        {/* CARD NUMBER */}
        <div style={{
          fontSize: isSmall ? 13 : 19,
          fontFamily: "'Courier New', monospace",
          fontWeight: 600,
          color: style.numberColor,
          letterSpacing: isSmall ? '0.15em' : '0.22em',
          textShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}>
          {displayNumber}
        </div>

        {/* BOTTOM ROW */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}>
          <div>
            <div style={{
              fontSize: isSmall ? 7 : 9,
              color: style.subTextColor,
              letterSpacing: '0.12em',
              marginBottom: 3,
              textTransform: 'uppercase',
            }}>
              Card Holder
            </div>
            <div style={{
              fontSize: isSmall ? 11 : 14,
              fontWeight: 600,
              color: style.textColor,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              maxWidth: isSmall ? 110 : 170,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {card?.cardName || 'YOUR NAME'}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: isSmall ? 7 : 9,
              color: style.subTextColor,
              letterSpacing: '0.12em',
              marginBottom: 3,
              textTransform: 'uppercase',
            }}>
              Valid Thru
            </div>
            <div style={{
              fontSize: isSmall ? 12 : 15,
              fontWeight: 700,
              color: expired ? '#FF6B6B' : style.textColor,
              letterSpacing: '0.08em',
              fontFamily: "'Courier New', monospace",
            }}>
              {card?.expiry || 'MM/YY'}
            </div>
          </div>
        </div>
      </div>

      {/* Expired badge */}
      {expired && card?.expiry && (
        <div style={{
          position: 'absolute',
          top: 10, right: 10,
          background: 'rgba(239,68,68,0.9)',
          color: '#fff',
          fontSize: 9,
          fontWeight: 700,
          padding: '3px 7px',
          borderRadius: 5,
          letterSpacing: '0.06em',
          zIndex: 10,
        }}>
          EXPIRED
        </div>
      )}
    </div>
  )

  // ── CARD BACK ─────────────────────────────────

  const CardBack = () => (
    <div style={{
      position: 'absolute',
      width: '100%', height: '100%',
      top: 0,
      left: 0,
      backfaceVisibility: 'hidden',
      WebkitBackfaceVisibility: 'hidden',
      borderRadius: 16,
      overflow: 'hidden',
      background: style.bg,
      transform: 'rotateY(180deg)',
      transformStyle: 'preserve-3d',
    }}>
      {/* Same texture as front */}
      <div style={{
        position: 'absolute', inset: 0,
        background: style.pattern,
      }} />

      {/* Customer service text at very top */}
      <div style={{
        position: 'absolute',
        top: isSmall ? 8 : 12,
        left: 0, right: 0,
        textAlign: 'center',
        fontSize: isSmall ? 7 : 9,
        color: style.subTextColor,
        letterSpacing: '0.03em',
        zIndex: 1,
        padding: '0 16px',
      }}>
        For customer service, call +123-456-789
      </div>

      {/* Black magnetic stripe */}
      <div style={{
        position: 'absolute',
        top: isSmall ? 22 : 32,
        left: 0, right: 0,
        height: isSmall ? 30 : 44,
        backgroundColor: '#111111',
        zIndex: 1,
      }} />

      {/* White signature strip + CVV */}
      <div style={{
        position: 'absolute',
        top: isSmall ? 60 : 88,
        left: isSmall ? 12 : 18,
        right: isSmall ? 12 : 18,
        height: isSmall ? 26 : 36,
        display: 'flex',
        zIndex: 1,
      }}>
        {/* White lined signature area */}
        <div style={{
          flex: 1,
          background: 'repeating-linear-gradient(' +
            '180deg,' +
            '#ffffff 0px, #ffffff 3px,' +
            '#e8e8e8 3px, #e8e8e8 4px)',
          borderRadius: '3px 0 0 3px',
        }} />

        {/* CVV box — white background, dark text */}
        <div style={{
          flexShrink: 0,
          width: isSmall ? 36 : 50,
          backgroundColor: '#FFFFFF',
          borderRadius: '0 3px 3px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}>
          <span style={{
            fontSize: isSmall ? 7 : 8,
            color: '#888888',
            letterSpacing: '0.05em',
            lineHeight: 1,
          }}>
            CVV
          </span>
          <span style={{
            fontSize: isSmall ? 13 : 17,
            fontFamily:
              "'Courier New', monospace",
            fontWeight: 700,
            color: '#1A1A1A',
            letterSpacing: '0.2em',
            lineHeight: 1,
          }}>
            {(isFlipped || showCVV) ? (card?.cvv || '•••') : '•••'}
          </span>
        </div>
      </div>

      {/* Bottom text block */}
      <div style={{
        position: 'absolute',
        bottom: isSmall ? 8 : 14,
        left: isSmall ? 12 : 18,
        right: isSmall ? 12 : 18,
        zIndex: 1,
      }}>
        <p style={{
          fontSize: isSmall ? 6 : 7.5,
          color: style.subTextColor,
          lineHeight: 1.5,
          marginBottom: isSmall ? 3 : 5,
          marginTop: 0,
        }}>
          This card is property of the issuing bank.
          Use of this card is subject to the
          cardholder agreement.
        </p>
        <p style={{
          fontSize: isSmall ? 6 : 7.5,
          color: style.subTextColor,
          lineHeight: 1.5,
          opacity: 0.7,
          margin: 0,
        }}>
          If found, please return to nearest
          bank branch or call the number above.
        </p>
      </div>
    </div>
  )

  // ── MAIN RENDER ───────────────────────────────

  return (
    <div style={{ userSelect: 'none' }}>
      <div
        ref={cardRef}
        style={{
          width: W,
          height: H,
          perspective: '1200px',
          cursor: 'pointer',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          setIsFlipped(f => !f)
          setRotation({ x: 0, y: 0 })
        }}
      >
        <div style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transition: 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isFlipped
            ? `rotateY(180deg) rotateX(${-rotation.x}deg)`
            : `rotateY(${rotation.y}deg) rotateX(${rotation.x}deg)`,
          filter: `drop-shadow(${rotation.y * 0.5}px ${rotation.x * 0.5}px 20px rgba(0,0,0,0.5))`,
        }}>
          <CardFront />
          <CardBack />
        </div>
      </div>

      {/* Flip hint */}
      <p style={{
        textAlign: 'center',
        fontSize: 10,
        color: '#888888',
        marginTop: 8,
      }}>
        Hover to tilt · Click to flip ↺
      </p>
    </div>
  )
}
