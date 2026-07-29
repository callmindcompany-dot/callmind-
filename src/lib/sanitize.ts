
// Utility to safely handle circular references and Firestore objects during JSON serialization
export const sanitize = (obj: any, maxDepth = 6): any => {
  const seen = new WeakSet();
  
  const deepClean = (value: any, depth: number): any => {
    // 1. Handle primitives and non-objects
    if (value === null || typeof value !== 'object') {
      return value;
    }

    // 2. Limit depth to prevent stack overflow
    if (depth > maxDepth) {
      return '[Depth Limit]';
    }

    // 3. Handle circularity via WeakSet
    try {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    } catch {
      return '[Non-Extensible Object]';
    }

    // 4. Handle specialized types
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Handle Firestore Timestamps (Web and Admin)
    if (typeof value.toDate === 'function') {
      try {
        return value.toDate().toISOString();
      } catch {
        return '[Invalid Timestamp]';
      }
    }

    // 5. Detect and flatten complex Firebase/Firestore internal objects
    const constructorName = value.constructor?.name || '';
    
    // Catch-all for objects that look like Firestore refs, collections, or internal state
    if (
      value.path || 
      value._path || 
      value.firestore || 
      value._firestore || 
      constructorName.includes('Firestore') || 
      constructorName.includes('Reference') || 
      constructorName.includes('Query') ||
      constructorName.includes('Firebase') ||
      constructorName.length === 1 || // Minified min (e.g. 'i', 'h' etc)
      constructorName.length === 2    // Minified (e.g. 'Y2', 'Ka')
    ) {
      // Return a shallow summary instead of recursing into the beast
      try {
        const path = value.path || value._path?.relativeName || value.id || 'complex';
        return `[${constructorName || 'FirebaseInternal'}:${path}]`;
      } catch {
        return `[${constructorName || 'FirebaseInternal'}]`;
      }
    }

    // Handle DOM nodes
    if (value.nodeType && value.nodeName) {
      return `[DOM:${value.nodeName}]`;
    }

    // 6. Handle Collections (Arrays, Maps, Sets)
    if (Array.isArray(value)) {
      return value.map(item => deepClean(item, depth + 1));
    }

    if (value instanceof Map) {
      const mapObj: any = {};
      value.forEach((v, k) => {
        mapObj[String(k)] = deepClean(v, depth + 1);
      });
      return mapObj;
    }

    if (value instanceof Set) {
      return Array.from(value).map(v => deepClean(v, depth + 1));
    }

    // 7. Handle plain objects - strictly and safely
    const result: any = {};
    try {
      const keys = Object.keys(value);
      for (const key of keys) {
        // Skip clearly internal properties to reduce bloat/circular risks
        if (key.startsWith('_') || key.startsWith('$')) continue;
        
        try {
          const val = value[key];
          // Skip functions entirely
          if (typeof val === 'function') continue;
          
          result[key] = deepClean(val, depth + 1);
        } catch (e) {
          result[key] = '[Access Error]';
        }
      }
    } catch (e) {
      return `[Uniterable Object: ${constructorName}]`;
    }

    return result;
  };

  try {
    return deepClean(obj, 0);
  } catch (err) {
    return `[Sanitization Failed: ${String(err)}]`;
  }
};
