// import saveTaskVideoDetails from '../saveTaskVideoDetails';

// const cloudName = 'ever-co';
// const CLOUDINARY_PRESET = 'streaming-preset'; // unsigned preset with HLS streaming eager transformation

// const uploadToCloudinary = (file: File, roomId: string, createdTaskId: string) => {
//     const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
//     const xhr = new XMLHttpRequest();
//     const fd = new FormData();
//     xhr.open('POST', url, true);
//     xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

//     // Update progress
//     xhr.upload.addEventListener('progress', function (e) {
//         console.log(`fileuploadprogress data.loaded: ${e.loaded}/${e.total}`);
//     });

//     // Asset upload completed
//     xhr.onreadystatechange = async function (e) {
//         if (xhr.readyState == 4 && xhr.status == 200) {
//             const res = JSON.parse(xhr.responseText);

//             console.log(res);

//             const thumbnailUrl = res?.secure_url.replace('.mkv', '.jpg');

//             const createdTVD = await saveTaskVideoDetails(
//                 VideoServices.CLOUDINARY,
//                 createdTaskId,
//                 roomId,
//                 roomId,
//                 res?.eager[0]?.secure_url,
//                 thumbnailUrl
//             );
//             console.log(createdTVD);
//         }
//     };

//     fd.append('upload_preset', CLOUDINARY_PRESET);
//     fd.append('tags', 'browser_upload');
//     fd.append('public_id', roomId);
//     fd.append('file', file);
//     fd.append('resource_type', 'video');

//     xhr.send(fd);
// };

// export default uploadToCloudinary;
