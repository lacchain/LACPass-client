/* eslint-disable max-len */
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';

export class Resource {
  @IsString()
  resourceType!: string;
}

export class Attachment {
  @IsString()
  contentType!: string;
  @IsString()
  data!: string;
}

export class Format {
  @IsString()
  system!: string;
  @IsString()
  code!: string;
}

export class Content {
  @IsDefined()
  @ValidateNested()
  @Type(() => Attachment)
  attachment!: Attachment;
  @IsDefined()
  @ValidateNested()
  @Type(() => Format)
  format!: Format;
}

export class DocumentReference extends Resource {
  @IsString()
  description!: string;
  @IsDefined()
  // @Type(() => Content[])
  @ValidateNested()
  content!: Content[];
}
export class Entry {
  @IsOptional()
  fullUrl?: string;
  @ValidateNested()
  @IsDefined()
  @Type(() => Resource)
  resource!: Resource;
}

export class BundleDTO {
  // eslint-disable-next-line max-len
  @ValidateNested() // doesn't get printed: { message: '"entry" must be an array of "Resources"' }
  @IsDefined()
  @IsArray()
  entry!: Entry[];
}
/**
 * @example - Let's consider the basic request. Note that file contents are truncated for space purposes in this example:
 ```js
 {
  "bundle": {
    "entry": [
      {
        "resource": {
          "resourceType": "DocumentReference",
          "description": "WHO QR code for COVID 19 Vaccine Certificate",
          "content": [
            {
              "attachment": {
                "contentType": "application/json",
                "data": "GVudGlmaWVyIjoiVVkvQkQ0NTc1MDAiLCJzZXgiOiJtYWxlIn0="
              },
              "format": {
                "system": "http://worldhealthorganization.github.io/ddcc/CodeSystem/DDCC-QR-Format-CodeSystem",
                "code": "serialized"
              }
            },
            {
              "attachment": {
                "contentType": "image/png",
                "data": "HtdZaa61HH9Zaa621Hv0PDq1c4dB/YlQAAAAASUVORK5CYII="
              },
              "format": {
                "system": "http://worldhealthorganization.github.io/ddcc/CodeSystem/DDCC-QR-Format-CodeSystem",
                "code": "image"
              }
            },
            {
              "attachment": {
                "contentType": "application/pdf",
                "data": "nN0YXJ0eHJlZgoyNDMxOAolJUVPRg=="
              },
              "format": {
                "system": "http://worldhealthorganization.github.io/ddcc/CodeSystem/DDCC-QR-Format-CodeSystem",
                "code": "pdf"
              }
            }
          ]
        }
      }
    ]
  },
  "issuerDid": "did:lac1:1iT4kYaSKhpM7BFB75ZxYF7V3uTRAeWfPvwhFZXJQj8WrJakCczSatqNVvKZTnsD3uMz",
  "receiverDid": "did:lac1:1iT5hMy9wbHfnd7C7QJCsQEiF7PusFngyCu2YqgLmCNJPQX77Z8WaXG6cwQtC4czY74w"
}
  ```
 */
export class DDCCToVCDTo {
  @ValidateNested()
  @IsDefined()
  @Type(() => BundleDTO)
  bundle!: BundleDTO;
  @IsString()
  issuerDid!: string;
  @IsString()
  receiverDid!: string;
}
