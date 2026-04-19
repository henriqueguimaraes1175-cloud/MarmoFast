
import { NestingPart } from '../types';

export const nestingService = {
  optimize: async (parts: NestingPart[], sheet: { width: number; height: number }) => {
    console.log("Otimizando plano de corte para", parts.length, "peças na chapa", sheet);
    return [];
  }
};
