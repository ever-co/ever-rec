import * as admin from 'firebase-admin';

export const uploadImageInBucket = async (
  fileData: string | Express.Multer.File,
  filePath: string
): Promise<any> => {
  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);

    let fileBuffer: Buffer;
    if (typeof fileData === 'string') {
      const getBase64Data = encoded => {
        const base64EncodedString = encoded.replace(
          /^data:\w+\/\w+;base64,/,
          ''
        );
        return base64EncodedString;
      };
      const photoData = getBase64Data(fileData);
      fileBuffer = Buffer.from(photoData, 'base64');
    } else {
      fileBuffer = fileData.buffer;
    }

    fileBuffer && (await file.save(fileBuffer));

    return file;
  } catch (err) {
    console.log(err);
  }
};
