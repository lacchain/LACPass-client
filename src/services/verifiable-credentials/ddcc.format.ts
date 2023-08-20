import { Type } from 'class-transformer';
import { IsDefined, IsNumber, IsString, ValidateNested } from 'class-validator';

export class DDCCCertificate {
  // period .. omitted
  // hcid .. omitted
  // version .. omitted
  // issuer .. omitted
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
  //   certificate!: DDCCCertificate; // omitted
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

export class DDCCVerifiableCredentialData {
  @IsString()
  issuerDid!: string;
  @IsString()
  receiverDid!: string;
  @ValidateNested()
  @IsDefined()
  @Type(() => DDCCFormatValidator)
  ddccData!: DDCCFormatValidator;
}
