import { Type } from 'class-transformer';
import { IsDefined, IsNumber, IsString, ValidateNested } from 'class-validator';

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

export class Vaccine {
  @IsString()
  code!: string;
}
export class Country {
  @IsString()
  code!: string;
}

export class Brand {
  @IsString()
  code!: string;
}

export class Vaccination {
  @Type(() => Vaccine)
  vaccine!: Vaccine;
  @IsString()
  date!: string;
  @IsNumber()
  dose!: number;
  @Type(() => Country)
  country!: Country;
  @IsString()
  centre!: string;
  @Type(() => Brand)
  brand!: Brand;
  @IsString()
  lot!: string;
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
  birthDate!: string;
  @IsString()
  identifier!: string;
  @IsString()
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
