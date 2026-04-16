/* Configuration to skip JWT authentication on public route using isPublic() method*/
import { SetMetadata } from '@nestjs/common';
export const IsPublicKey = 'isPublic';
export const Public = () => SetMetadata(IsPublicKey, true);
export const getMethod = "Requested Method : GET";
export const postMethod = "Requested Method : POST";
export const putMethod = "Requested Method : PUT";
export const patchMethod = "Requested Method : PATCH";
export const deleteMethod = "Requested Method : DELETE";