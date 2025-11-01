// AI-powered device detection using OpenAI
export interface DeviceDetectionResult {
  deviceName: string
  confidence: number
  deviceType: string
  brand: string
  model: string
}

export async function detectDeviceFromDescription(description: string, fullTicketData?: any): Promise<DeviceDetectionResult> {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      console.warn('OpenAI API key not found, using fallback detection')
      return fallbackDeviceDetection(description)
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a device detection expert. Analyze repair ticket descriptions and extract device information. 
            Return ONLY a JSON object with this exact structure:
            {
              "deviceName": "Clear, concise device name (e.g., 'iPhone 15 Pro Max', 'Samsung Galaxy S23', 'iPad 9th Gen')",
              "confidence": 0.95,
              "deviceType": "phone|tablet|laptop|watch|other",
              "brand": "Apple|Samsung|Huawei|Lenovo|etc",
              "model": "Specific model identifier"
            }
            
            Rules:
            - If device is unclear, use "Unknown Device" but try to extract any identifiable info
            - Confidence should be 0.0-1.0 based on how certain you are
            - Be concise but descriptive for deviceName
            - Return ONLY the JSON, no other text`
          },
          {
            role: 'user',
            content: `Analyze this repair ticket and extract device information. 
            Description: "${description}"
            ${fullTicketData ? `Additional context: Subject: "${fullTicketData.subject || ''}", Customer: "${fullTicketData.customer_name || ''}", Notes: "${fullTicketData.notes || ''}"` : ''}`
          }
        ],
        max_tokens: 150,
        temperature: 0.1
      })
    })

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText)
      return fallbackDeviceDetection(description)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim()
    
    if (!content) {
      return fallbackDeviceDetection(description)
    }

    try {
      const result = JSON.parse(content)
      return {
        deviceName: result.deviceName || 'Unknown Device',
        confidence: result.confidence || 0.5,
        deviceType: result.deviceType || 'other',
        brand: result.brand || 'Unknown',
        model: result.model || 'Unknown'
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError)
      return fallbackDeviceDetection(description)
    }

  } catch (error) {
    console.error('Device detection error:', error)
    return fallbackDeviceDetection(description)
  }
}

// Fallback device detection using regex patterns
function fallbackDeviceDetection(description: string): DeviceDetectionResult {
  const text = description.toLowerCase()
  
  // iPhone patterns
  if (text.includes('iphone')) {
    const iphoneMatch = text.match(/iphone\s*(\d+[a-z]*\s*(?:pro|max|plus|mini)?)/i)
    if (iphoneMatch) {
      return {
        deviceName: `iPhone ${iphoneMatch[1]}`,
        confidence: 0.9,
        deviceType: 'phone',
        brand: 'Apple',
        model: `iPhone ${iphoneMatch[1]}`
      }
    }
    return {
      deviceName: 'iPhone',
      confidence: 0.7,
      deviceType: 'phone',
      brand: 'Apple',
      model: 'iPhone'
    }
  }
  
  // iPad patterns
  if (text.includes('ipad')) {
    const ipadMatch = text.match(/ipad\s*(\d+[a-z]*\s*(?:gen|generation)?)/i)
    if (ipadMatch) {
      return {
        deviceName: `iPad ${ipadMatch[1]}`,
        confidence: 0.9,
        deviceType: 'tablet',
        brand: 'Apple',
        model: `iPad ${ipadMatch[1]}`
      }
    }
    return {
      deviceName: 'iPad',
      confidence: 0.7,
      deviceType: 'tablet',
      brand: 'Apple',
      model: 'iPad'
    }
  }
  
  // Samsung patterns
  if (text.includes('samsung') || text.includes('galaxy')) {
    const galaxyMatch = text.match(/galaxy\s*([a-z0-9\s]+)/i)
    if (galaxyMatch) {
      return {
        deviceName: `Samsung Galaxy ${galaxyMatch[1].trim()}`,
        confidence: 0.8,
        deviceType: 'phone',
        brand: 'Samsung',
        model: `Galaxy ${galaxyMatch[1].trim()}`
      }
    }
    return {
      deviceName: 'Samsung Galaxy',
      confidence: 0.6,
      deviceType: 'phone',
      brand: 'Samsung',
      model: 'Galaxy'
    }
  }
  
  // Huawei patterns
  if (text.includes('huawei')) {
    const huaweiMatch = text.match(/huawei\s*([a-z0-9\s]+)/i)
    if (huaweiMatch) {
      return {
        deviceName: `Huawei ${huaweiMatch[1].trim()}`,
        confidence: 0.8,
        deviceType: 'phone',
        brand: 'Huawei',
        model: huaweiMatch[1].trim()
      }
    }
    return {
      deviceName: 'Huawei Phone',
      confidence: 0.6,
      deviceType: 'phone',
      brand: 'Huawei',
      model: 'Unknown'
    }
  }
  
  // MacBook patterns
  if (text.includes('macbook')) {
    const macbookMatch = text.match(/macbook\s*([a-z0-9\s]+)/i)
    if (macbookMatch) {
      return {
        deviceName: `MacBook ${macbookMatch[1].trim()}`,
        confidence: 0.9,
        deviceType: 'laptop',
        brand: 'Apple',
        model: `MacBook ${macbookMatch[1].trim()}`
      }
    }
    return {
      deviceName: 'MacBook',
      confidence: 0.7,
      deviceType: 'laptop',
      brand: 'Apple',
      model: 'MacBook'
    }
  }
  
  // Lenovo patterns
  if (text.includes('lenovo')) {
    const lenovoMatch = text.match(/lenovo\s*([a-z0-9\s]+)/i)
    if (lenovoMatch) {
      return {
        deviceName: `Lenovo ${lenovoMatch[1].trim()}`,
        confidence: 0.8,
        deviceType: 'laptop',
        brand: 'Lenovo',
        model: lenovoMatch[1].trim()
      }
    }
    return {
      deviceName: 'Lenovo Laptop',
      confidence: 0.6,
      deviceType: 'laptop',
      brand: 'Lenovo',
      model: 'Unknown'
    }
  }
  
  // Garmin patterns
  if (text.includes('garmin')) {
    const garminMatch = text.match(/garmin\s*([a-z0-9\s]+)/i)
    if (garminMatch) {
      return {
        deviceName: `Garmin ${garminMatch[1].trim()}`,
        confidence: 0.8,
        deviceType: 'watch',
        brand: 'Garmin',
        model: garminMatch[1].trim()
      }
    }
    return {
      deviceName: 'Garmin Watch',
      confidence: 0.6,
      deviceType: 'watch',
      brand: 'Garmin',
      model: 'Unknown'
    }
  }
  
  // Default fallback
  return {
    deviceName: 'Unknown Device',
    confidence: 0.1,
    deviceType: 'other',
    brand: 'Unknown',
    model: 'Unknown'
  }
}

// Cache for device detection results to avoid repeated API calls
const deviceCache = new Map<string, DeviceDetectionResult>()

export async function getCachedDeviceDetection(description: string, fullTicketData?: any): Promise<DeviceDetectionResult> {
  const cacheKey = description.toLowerCase().trim()
  
  if (deviceCache.has(cacheKey)) {
    return deviceCache.get(cacheKey)!
  }
  
  const result = await detectDeviceFromDescription(description, fullTicketData)
  deviceCache.set(cacheKey, result)
  
  return result
}
