export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const MIN_HEIGHT_INCHES = 6;
const MIN_WIDTH_INCHES = 4;
const MAX_HEIGHT_INCHES = 120;
const MAX_WIDTH_INCHES = 240;
const MIN_TEXT_LENGTH = 1;
const MAX_TEXT_LENGTH = 50;

export function validateTextInput(text: string, fieldName = "text"): ValidationError[] {
  const errors: ValidationError[] = [];
  const stripped = text.replace(/\s+/g, "");
  if (stripped.length < MIN_TEXT_LENGTH) {
    errors.push({ field: fieldName, message: "Enter at least 1 character" });
  }
  if (stripped.length > MAX_TEXT_LENGTH) {
    errors.push({ field: fieldName, message: `Maximum ${MAX_TEXT_LENGTH} characters` });
  }
  return errors;
}

export function validateDimension(
  value: number,
  fieldName: string,
  min = MIN_WIDTH_INCHES,
  max = MAX_WIDTH_INCHES,
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!value || value <= 0) {
    errors.push({ field: fieldName, message: `${fieldName} must be greater than 0` });
  } else if (value < min) {
    errors.push({ field: fieldName, message: `Minimum ${min}" for ${fieldName}` });
  } else if (value > max) {
    errors.push({ field: fieldName, message: `Maximum ${max}" for ${fieldName}` });
  }
  return errors;
}

export function validateHeight(value: number): ValidationError[] {
  return validateDimension(value, "height", MIN_HEIGHT_INCHES, MAX_HEIGHT_INCHES);
}

export function validateWidth(value: number): ValidationError[] {
  return validateDimension(value, "width", MIN_WIDTH_INCHES, MAX_WIDTH_INCHES);
}

export function validateChannelLetterConfig(config: {
  text: string;
  height: number;
}): ValidationResult {
  const errors = [
    ...validateTextInput(config.text),
    ...validateHeight(config.height),
  ];
  return { valid: errors.length === 0, errors };
}

export function validatePanelConfig(config: {
  widthInches: number;
  heightInches: number;
}): ValidationResult {
  const errors = [
    ...validateWidth(config.widthInches),
    ...validateHeight(config.heightInches),
  ];
  return { valid: errors.length === 0, errors };
}
