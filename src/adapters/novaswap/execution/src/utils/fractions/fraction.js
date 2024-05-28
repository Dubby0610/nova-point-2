"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Fraction = void 0;
const tiny_invariant_1 = __importDefault(require("tiny-invariant"));
const decimal_js_light_1 = __importDefault(require("decimal.js-light"));
const big_js_1 = __importDefault(require("big.js"));
// @ts-ignore
const toformat_1 = __importDefault(require("toformat"));
const constant_1 = require("../constant");
const Decimal = (0, toformat_1.default)(decimal_js_light_1.default);
const Big = (0, toformat_1.default)(big_js_1.default);
const toSignificantRounding = {
    [constant_1.Rounding.ROUND_DOWN]: Decimal.ROUND_DOWN,
    [constant_1.Rounding.ROUND_HALF_UP]: Decimal.ROUND_HALF_UP,
    [constant_1.Rounding.ROUND_UP]: Decimal.ROUND_UP,
};
const toFixedRounding = {
    [constant_1.Rounding.ROUND_DOWN]: 0 /* RoundingL2_CHAIN_ID.RoundDown */,
    [constant_1.Rounding.ROUND_HALF_UP]: 1 /* RoundingL2_CHAIN_ID.RoundHalfUp */,
    [constant_1.Rounding.ROUND_UP]: 3 /* RoundingL2_CHAIN_ID.RoundUp */,
};
class Fraction {
    numerator;
    denominator;
    constructor(numerator, denominator = 1n) {
        this.numerator = BigInt(numerator);
        this.denominator = BigInt(denominator);
    }
    static tryParseFraction(fractionish) {
        if (typeof fractionish === 'bigint' || typeof fractionish === 'number' || typeof fractionish === 'string')
            return new Fraction(fractionish);
        if ('numerator' in fractionish && 'denominator' in fractionish)
            return fractionish;
        throw new Error('Could not parse fraction');
    }
    // performs floor division
    get quotient() {
        return this.numerator / this.denominator;
    }
    // remainder after floor division
    get remainder() {
        return new Fraction(this.numerator % this.denominator, this.denominator);
    }
    invert() {
        return new Fraction(this.denominator, this.numerator);
    }
    add(other) {
        const otherParsed = Fraction.tryParseFraction(other);
        if (this.denominator === otherParsed.denominator) {
            return new Fraction(this.numerator + otherParsed.numerator, this.denominator);
        }
        return new Fraction(this.numerator * otherParsed.denominator + otherParsed.numerator * this.denominator, this.denominator * otherParsed.denominator);
    }
    subtract(other) {
        const otherParsed = Fraction.tryParseFraction(other);
        if (this.denominator === otherParsed.denominator) {
            return new Fraction(this.numerator - otherParsed.numerator, this.denominator);
        }
        return new Fraction(this.numerator * otherParsed.denominator - otherParsed.numerator * this.denominator, this.denominator * otherParsed.denominator);
    }
    lessThan(other) {
        const otherParsed = Fraction.tryParseFraction(other);
        return this.numerator * otherParsed.denominator < otherParsed.numerator * this.denominator;
    }
    equalTo(other) {
        const otherParsed = Fraction.tryParseFraction(other);
        return this.numerator * otherParsed.denominator === otherParsed.numerator * this.denominator;
    }
    greaterThan(other) {
        const otherParsed = Fraction.tryParseFraction(other);
        return this.numerator * otherParsed.denominator > otherParsed.numerator * this.denominator;
    }
    multiply(other) {
        const otherParsed = Fraction.tryParseFraction(other);
        return new Fraction(this.numerator * otherParsed.numerator, this.denominator * otherParsed.denominator);
    }
    divide(other) {
        const otherParsed = Fraction.tryParseFraction(other);
        return new Fraction(this.numerator * otherParsed.denominator, this.denominator * otherParsed.numerator);
    }
    toSignificant(significantDigits, format = { groupSeparator: '' }, rounding = constant_1.Rounding.ROUND_HALF_UP) {
        (0, tiny_invariant_1.default)(Number.isInteger(significantDigits), `${significantDigits} is not an integer.`);
        (0, tiny_invariant_1.default)(significantDigits > 0, `${significantDigits} is not positive.`);
        Decimal.set({ precision: significantDigits + 1, rounding: toSignificantRounding[rounding] });
        const quotient = new Decimal(this.numerator.toString())
            .div(this.denominator.toString())
            .toSignificantDigits(significantDigits);
        return quotient.toFormat(quotient.decimalPlaces(), format);
    }
    toFixed(decimalPlaces, format = { groupSeparator: '' }, rounding = constant_1.Rounding.ROUND_HALF_UP) {
        (0, tiny_invariant_1.default)(Number.isInteger(decimalPlaces), `${decimalPlaces} is not an integer.`);
        (0, tiny_invariant_1.default)(decimalPlaces >= 0, `${decimalPlaces} is negative.`);
        Big.DP = decimalPlaces;
        Big.RM = toFixedRounding[rounding];
        return new Big(this.numerator.toString()).div(this.denominator.toString()).toFormat(decimalPlaces, format);
    }
    /**
     * Helper method for converting any super class back to a fraction
     */
    get asFraction() {
        return new Fraction(this.numerator, this.denominator);
    }
}
exports.Fraction = Fraction;
