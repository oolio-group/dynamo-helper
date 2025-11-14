import { buildConditionExpressions, buildUpdateExpressions } from './expressionBuilder';
import { ConditionExpressionKind } from '../types';

describe('expressionBuilder', () => {
  describe('buildConditionExpressions', () => {
    it('should build simple equality condition', () => {
      const result = buildConditionExpressions([
        {
          kind: ConditionExpressionKind.Comparison,
          key: 'status',
          comparator: 'eq',
          value: 'active',
        },
      ]);

      expect(result.expression).toBe('#key_status = :val0');
      expect(result.attrNames).toEqual({ '#key_status': 'status' });
      expect(result.attrValues).toEqual({ ':val0': 'active' });
    });

    it('should build condition with AND operator', () => {
      const result = buildConditionExpressions([
        {
          kind: ConditionExpressionKind.Comparison,
          key: 'id',
          comparator: 'eq',
          value: 123,
        },
        { kind: ConditionExpressionKind.AndOr, value: 'AND' },
        {
          kind: ConditionExpressionKind.Comparison,
          key: 'status',
          comparator: 'eq',
          value: 'active',
        },
      ]);

      expect(result.expression).toBe('#key_id = :val0 AND #key_status = :val2');
      expect(result.attrNames).toEqual({
        '#key_id': 'id',
        '#key_status': 'status',
      });
      expect(result.attrValues).toEqual({
        ':val0': 123,
        ':val2': 'active',
      });
    });

    it('should build BETWEEN condition', () => {
      const result = buildConditionExpressions([
        {
          kind: ConditionExpressionKind.Comparison,
          key: 'age',
          comparator: 'between',
          value: [20, 30],
        },
      ]);

      expect(result.expression).toBe('#key_age BETWEEN :val0_1 AND :val0_2');
      expect(result.attrNames).toEqual({ '#key_age': 'age' });
      expect(result.attrValues).toEqual({
        ':val0_1': 20,
        ':val0_2': 30,
      });
    });

    it('should handle complex condition with OR and AND', () => {
      const result = buildConditionExpressions([
        {
          kind: ConditionExpressionKind.Comparison,
          key: 'id',
          comparator: 'eq',
          value: 123,
        },
        { kind: ConditionExpressionKind.AndOr, value: 'OR' },
        {
          kind: ConditionExpressionKind.Comparison,
          key: 'name',
          comparator: 'eq',
          value: 'John',
        },
        { kind: ConditionExpressionKind.AndOr, value: 'AND' },
        {
          kind: ConditionExpressionKind.Comparison,
          key: 'age',
          comparator: 'gt',
          value: 20,
        },
      ]);

      expect(result.expression).toBe(
        '#key_id = :val0 OR #key_name = :val2 AND #key_age > :val4',
      );
    });
  });

  describe('buildUpdateExpressions', () => {
    it('should build update expression for single attribute', () => {
      const result = buildUpdateExpressions({ name: 'John' });

      expect(result.expression).toBe('SET #key_name = :val_name');
      expect(result.attrNames).toEqual({ '#key_name': 'name' });
      expect(result.attrValues).toEqual({ ':val_name': 'John' });
    });

    it('should build update expression for multiple attributes', () => {
      const result = buildUpdateExpressions({
        name: 'John',
        age: 30,
        status: 'active',
      });

      expect(result.expression).toContain('SET ');
      expect(result.expression).toContain('#key_name = :val_name');
      expect(result.expression).toContain('#key_age = :val_age');
      expect(result.expression).toContain('#key_status = :val_status');
      expect(result.attrNames).toEqual({
        '#key_name': 'name',
        '#key_age': 'age',
        '#key_status': 'status',
      });
      expect(result.attrValues).toEqual({
        ':val_name': 'John',
        ':val_age': 30,
        ':val_status': 'active',
      });
    });

    it('should handle empty object', () => {
      const result = buildUpdateExpressions({});

      expect(result.expression).toBe('SET ');
      expect(result.attrNames).toEqual({});
      expect(result.attrValues).toEqual({});
    });
  });
});
