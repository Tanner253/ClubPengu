/**
 * Browser polyfills for Node.js globals
 * Must be imported FIRST before any Solana packages
 */
import { Buffer } from 'buffer'

// Make Buffer available globally (required by @solana/spl-token)
window.Buffer = Buffer
globalThis.Buffer = Buffer

// Note: Three.js is loaded dynamically in components
// The "Multiple instances" warning is harmless - it occurs because
// some components use window.THREE (CDN) and others use npm imports
// This doesn't affect functionality



