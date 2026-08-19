import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

export const uploadToCloudinary = (fileBuffer, folder, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

export const deleteFromCloudinary = async (publicId) => {
  return await cloudinary.uploader.destroy(publicId);
};

export const updateCloudinaryImage = async (
  fileBuffer,
  oldPublicId,
  folder,
) => {
  if (oldPublicId) {
    await deleteFromCloudinary(oldPublicId);
  }

  return await uploadToCloudinary(fileBuffer, folder);
};

// import cloudinary from "../config/cloudinary.js";
// import streamifier from 'streamifier';

// export const uploadToCloudinary = (fileBuffer, folder) => {
//   return new Promise((resolve, reject) => {
//     const stream = cloudinary.uploader.upload_stream(
//       { folder },
//       (error, result) => {
//         if (error) return reject(error);
//         resolve(result);
//       }
//     );

//     streamifier.createReadStream(fileBuffer).pipe(stream);
//   });
// };

// export const deleteFromCloudinary = async (publicId) => {
//   return await cloudinary.uploader.destroy(publicId);
// };

// export const updateCloudinaryImage = async (
//   fileBuffer,
//   oldPublicId,
//   folder
// ) => {
//   if (oldPublicId) {
//     await deleteFromCloudinary(oldPublicId);
//   }

//   return await uploadToCloudinary(fileBuffer, folder);
// };
