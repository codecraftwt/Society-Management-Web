import API from "./api";

export async function uploadMyProfilePicture(file) {
  const form = new FormData();
  form.append("photo", file);
  const res = await API.put("/users/me/profile-picture", form);
  return res.data?.profile_picture ?? null;
}

export async function removeMyProfilePicture() {
  const res = await API.delete("/users/me/profile-picture");
  return res.data?.profile_picture ?? null;
}
