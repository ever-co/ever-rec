import { IMarker } from '@/app/interfaces/IMarker';
import { IMarkerComment } from '@/content/panel/screens/editorScreen/toolsPanel/toolsOptions/interface/IMarkerComment';

export class MarkerService {
  static addMarker(
    userId: string,
    markerId: string,
    imageId: string,
    setMarkers: React.Dispatch<React.SetStateAction<IMarker[]>>,
  ) {
    const marker: IMarker = {
      id: markerId,
      admin: userId,
      imageId: imageId,
      created: Date.now(),
      comments: [],
    };
    setMarkers((prev) => [...prev, marker]);
  }

  static addCommentToMarker(
    markerId: string,
    comment: IMarkerComment,
    setMarkers: React.Dispatch<React.SetStateAction<IMarker[]>>,
    callback?: (updatedMarkers: IMarker[]) => void,
  ) {
    setMarkers((prev) => {
      const updated = prev.map((marker) =>
        marker.id === markerId
          ? { ...marker, comments: [...marker.comments, comment] }
          : marker,
      );

      if (callback) {
        callback(updated);
      }

      return updated;
    });
  }

  static removeMarker(
    markerId: string,
    setMarkers: React.Dispatch<React.SetStateAction<IMarker[]>>,
    callback?: (updatedMarkers: IMarker[]) => void,
  ) {
    setMarkers((prev) => {
      const updated = prev.filter((marker) => marker.id !== markerId);

      if (callback) {
        callback(updated);
      }

      return updated;
    });
  }

  static removeCommentFromMarker(
    markerId: string,
    commentId: string,
    setMarkers: React.Dispatch<React.SetStateAction<IMarker[]>>,
    callback?: (updatedMarkers: IMarker[]) => void,
  ) {
    setMarkers((prev) => {
      const updated = prev.map((marker) =>
        marker.id === markerId
          ? {
              ...marker,
              comments: marker.comments.filter(
                (comment) => comment.id !== commentId,
              ),
            }
          : marker,
      );

      if (callback) {
        callback(updated);
      }

      return updated;
    });
  }

  static updateCommentInMarker(
    markerId: string,
    commentId: string,
    updatedComment: Partial<IMarkerComment>,
    setMarkers: React.Dispatch<React.SetStateAction<IMarker[]>>,
    callback?: (updatedMarkers: IMarker[]) => void,
  ) {
    setMarkers((prev) => {
      const updated = prev.map((marker) => {
        if (marker.id === markerId) {
          return {
            ...marker,
            comments: marker.comments.map((comment) => {
              if (comment.id === commentId) {
                return { ...comment, ...updatedComment };
              }
              return comment;
            }),
          };
        }
        return marker;
      });

      if (callback) {
        callback(updated);
      }

      return updated;
    });
  }
}
