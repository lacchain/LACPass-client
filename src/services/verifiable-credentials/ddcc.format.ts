import { Type } from 'class-transformer';
import {
  IsDefined,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';

export class Identifier {
  @IsString()
  value!: string;
}
export class Issuer {
  @Type(() => Identifier)
  identifier!: Identifier;
}

export class DDCCCertificate {
  // period .. omitted
  @Type(() => Identifier)
  hcid!: Identifier;
  // version .. omitted
  @Type(() => Issuer)
  issuer!: Issuer;
}

export class CodeSystem {
  @IsString()
  code!: string;
}

export class Vaccination {
  @Type(() => CodeSystem)
  vaccine!: CodeSystem;
  @IsString()
  date!: string;
  @IsNumber()
  dose!: number;
  @Type(() => CodeSystem)
  country!: CodeSystem;
  @IsString()
  @IsOptional()
  centre!: string;
  @IsString()
  @IsOptional()
  nextDose!: string;
  @Type(() => CodeSystem)
  brand!: CodeSystem;
  @IsString()
  lot!: string;
  @IsOptional()
  @Type(() => CodeSystem)
  @ValidateNested()
  maholder!: CodeSystem;
  @IsOptional()
  @Type(() => CodeSystem)
  @ValidateNested()
  disease!: CodeSystem;
  @IsOptional()
  @IsString()
  totalDoses!: string;
  @IsOptional()
  @IsString()
  validFrom!: string;
  @IsOptional()
  @Type(() => Identifier)
  @ValidateNested()
  practitioner!: Identifier;
}

export class DDCCFormatValidator {
  // @IsString()
  // resourceType!: string; // omitted
  @Type(() => DDCCCertificate)
  certificate!: DDCCCertificate; // omitted
  @Type(() => Vaccination)
  vaccination!: Vaccination;
  @IsString()
  name!: string;
  @IsString()
  @IsOptional()
  birthDate!: string;
  @IsString()
  @IsOptional()
  identifier!: string;
  @IsString()
  @IsOptional()
  sex!: string;
}

export class DDCCCoreDataSet {
  @IsString()
  issuerDid!: string;
  @IsString()
  receiverDid!: string;
  @ValidateNested()
  @IsDefined()
  @Type(() => DDCCFormatValidator)
  ddccData!: DDCCFormatValidator;
}
