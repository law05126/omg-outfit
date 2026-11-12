import { useEffect, useRef, useState } from 'react'
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

export default function TryOn({ product, onClose }) {
  const video = useRef(), canvas = useRef()
  const [status, setStatus] = useState('Starting camera…')
  useEffect(() => {
    let raf, stream, lm, dead = false
    const img = new Image(); img.crossOrigin = 'anonymous'; img.src = product.image_url
    const put = (c, cx, cy, w, ratio = img.naturalHeight / img.naturalWidth) => c.drawImage(img, cx - w / 2, cy - (w * ratio) / 2, w, w * ratio)
    ;(async () => {
      try {
        if (product.category === 'rings') return setStatus('Ring try-on is coming soon. Tops, pants, sunglasses, necklaces and bracelets work now.')
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })
        video.current.srcObject = stream; await video.current.play()
        setStatus('Loading body scanner…')
        const fs = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm')
        lm = await PoseLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task' }, runningMode: 'VIDEO', numPoses: 1 })
        setStatus('Stand back so your upper body is in view')
        const c = canvas.current.getContext('2d'), W = 640, H = 480
        const loop = () => {
          if (dead) return
          c.save(); c.scale(-1, 1); c.drawImage(video.current, -W, 0, W, H)   // mirror view
          const r = lm.detectForVideo(video.current, performance.now()).landmarks?.[0]
          if (r && img.complete && img.naturalWidth) {
            const P = i => ({ x: (1 - r[i].x) * W * -1, y: r[i].y * H })          // mirrored x for the flipped context
            const sh = mid(P(11), P(12)), sw = dist(P(11), P(12)), cat = product.category
            if (cat === 'tops') put(c, sh.x, sh.y + sw * 0.75, sw * 2)
            else if (cat === 'bottoms') { const hip = mid(P(23), P(24)), an = mid(P(27), P(28)); put(c, hip.x, (hip.y + an.y) / 2, dist(P(23), P(24)) * 2.4, Math.abs(an.y - hip.y) * 1.1 / (dist(P(23), P(24)) * 2.4)) }
            else if (cat === 'sunglasses') { const e = mid(P(2), P(5)); put(c, e.x, e.y, dist(P(2), P(5)) * 2.6) }
            else if (cat === 'necklaces') { const n = P(0); put(c, sh.x, n.y + (sh.y - n.y) * 0.8, sw * 0.6) }
            else if (cat === 'bracelets') { [15, 16].forEach(i => put(c, P(i).x, P(i).y, sw * 0.35)) }
          }
          c.restore(); raf = requestAnimationFrame(loop)
        }
        setStatus(''); loop()
      } catch (e) { setStatus('Camera not available. Allow camera access and reload.') }
    })()
    return () => { dead = true; cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()); lm?.close() }
  }, [product])
  return (<div className="veil" onClick={onClose}><div className="sheet tryon" onClick={e => e.stopPropagation()}>
    <button className="x" onClick={onClose} aria-label="Close">×</button>
    <h2>Trying on: {product.name}</h2>
    <video ref={video} playsInline muted hidden /><canvas ref={canvas} width="640" height="480" />
    {status && <p className="empty">{status}</p>}
    <p className="fine">Your camera feed stays on your device. Nothing is recorded or uploaded.</p>
  </div></div>)
}
