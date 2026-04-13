export const DRIVE_LAYOUT = {
  root: "ROOT_FOLDER_ID", // Replace with actual root folder ID
  common: "COMMON_FOLDER_ID", // Replace with actual common subjects folder ID
  tracks: {
    lettres: "LETTRES_FOLDER_ID", // Replace with actual letters track folder ID
    svt: "SVT_FOLDER_ID", // Replace with actual SVT track folder ID
    sm: "SM_FOLDER_ID", // Replace with actual math sciences track folder ID
    pc: "PC_FOLDER_ID" // Replace with actual physics/chemistry track folder ID
  }
};

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  size?: string;
  modifiedTime?: string;
}

export interface DriveFolderContent {
  files: DriveFile[];
  nextPageToken?: string;
}
