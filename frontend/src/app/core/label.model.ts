export interface Label {
  uuid: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface LabelCreateRequest {
  uuid: string;
  name: string;
  color: string;
}

export interface LabelUpdateRequest {
  name: string;
  color: string;
}
