import { ValueTransformer } from 'typeorm';

export const decimalToNumberTransformer: ValueTransformer = {
    to: (entityValue: number) => entityValue,
    from: (databaseValue: string): number => parseFloat(databaseValue),
};
