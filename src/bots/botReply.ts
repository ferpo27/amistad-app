```typescript
import { matches } from '../mock/matches';

export function botReply(message: string): string {
  // Implementación de la función botReply
  // Por ejemplo, podrías utilizar la variable matches para generar una respuesta
  return `Respuesta a ${message}`;
}

export { botReply };
```