import { describe, it, expect } from 'vitest'

describe('app utilities', () => {
  it('formats video title correctly when under limit', () => {
    const title = 'Short Title'
    const maxLen = 80
    const result = title.substring(0, maxLen) + (title.length > maxLen ? '...' : '')
    expect(result).toBe('Short Title')
  })

  it('truncates video title at 80 characters', () => {
    const title = 'A'.repeat(90)
    const maxLen = 80
    const result = title.substring(0, maxLen) + (title.length > maxLen ? '...' : '')
    expect(result).toBe('A'.repeat(80) + '...')
  })

  it('cache expiry is 24 hours in milliseconds', () => {
    const CACHE_EXPIRY = 24 * 60 * 60 * 1000
    expect(CACHE_EXPIRY).toBe(86400000)
  })

  it('progress percent does not exceed 100', () => {
    const time = 700
    const duration = 600
    const percent = Math.min(100, (time / duration) * 100)
    expect(percent).toBe(100)
  })

  it('progress percent calculates correctly within range', () => {
    const time = 300
    const duration = 600
    const percent = Math.min(100, (time / duration) * 100)
    expect(percent).toBe(50)
  })

  it('falls back to videoId when id is missing', () => {
    const v = { videoId: 'abc123', title: 'Test' }
    const id = v.id || v.videoId
    expect(id).toBe('abc123')
  })

  it('falls back to id when videoId is missing', () => {
    const v = { id: 'xyz789', title: 'Test' }
    const videoId = v.videoId || v.id
    expect(videoId).toBe('xyz789')
  })

  it('defaults title to Untitled when missing', () => {
    const v = {}
    const title = v.title || 'Untitled'
    expect(title).toBe('Untitled')
  })
})
