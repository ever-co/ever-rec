// // import API from "../../getAPI";

// import saveTaskVideoDetails from "../saveTaskVideoDetails";

// const uploadToLocalStorage = async (
//     createdFile: File,
//     roomId: string,
//     createdTaskId: string,
// ) => {
//     const payload = new FormData();
//     payload.append('file', createdFile);

//     const data = await fetch(`${API}/local-storage/upload-video`, {
//         method: 'POST',
//         body: payload,
//     }).then(res => res.json());

//     const createdTVD = await saveTaskVideoDetails(
//         VideoServices.LOCAL_STORAGE,
//         createdTaskId,
//         roomId,
//         data.id,
//         data.playbackUrl,
//         null, // todo create thumbnail
//         data.playbackStatus,
//     );
//     console.log('createdTVD', createdTVD);
// };

// export default uploadToLocalStorage;
