export async function submitCertificationImage(file, dependencies) {
  const { getUploadUrl, uploadImage, certificate } = dependencies;
  const { uploadUrl, imageKey } = await getUploadUrl(file.name, file.type);

  await uploadImage(uploadUrl, file);
  await certificate(imageKey);

  return imageKey;
}
