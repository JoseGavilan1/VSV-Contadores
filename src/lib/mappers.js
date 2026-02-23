export const mapperToCamel = (obj) => {
  if (Array.isArray(obj)) return obj.map(mapperToCamel);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/(_\w)/g, (m) => m[1].toUpperCase());
      acc[camelKey] = mapperToCamel(obj[key]);
      return acc;
    }, {});
  }
  return obj;
};

export const mapperToSnake = (obj) => {
  if (Array.isArray(obj)) return obj.map(mapperToSnake);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      acc[snakeKey] = mapperToSnake(obj[key]);
      return acc;
    }, {});
  }
  return obj;
};