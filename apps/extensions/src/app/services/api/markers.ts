import api from '@/app/services/api/api';
import { IMarker } from '@/app/interfaces/IMarker';
import { IDataResponse } from '@/app/interfaces/IDataResponse';
import { IMarkerComment } from '@/content/panel/screens/editorScreen/toolsPanel/toolsOptions/interface/IMarkerComment';
export class MarkerAPI {
  static async create(
    markerId: string,
    imageId: string,
  ): Promise<IDataResponse<IMarker | null>> {
    return api.post(
      `/api/v1/markers/new?imageId=${imageId}&markerId=${markerId}`,
    );
  }

  static async delete(
    markerId: string,
  ): Promise<IDataResponse<IMarker | null>> {
    return api.delete(`/api/v1/markers/${markerId}`);
  }

  static async addComment(
    markerId: string,
    comment: IMarkerComment,
  ): Promise<IDataResponse<IMarker | null>> {
    return api.post(`/api/v1/markers/comments/${markerId}`, {
      comment,
    });
  }

  static async getAllMarkersByImageId(
    imageId: string,
  ): Promise<IDataResponse<Array<IMarker> | null>> {
    return api.get(`/api/v1/markers/all/${imageId}`);
  }
}
