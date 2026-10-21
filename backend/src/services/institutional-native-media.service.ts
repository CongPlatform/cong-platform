/** Public editorial photographs bundled as replaceable example media. */
const editorialMedia = new Map<string, string>([
  ["146e56f0-9e93-5a77-b1c7-3d08f4696d16", "https://images.unsplash.com/photo-1523240795612-9a054b0db644"],
  ["2ea778c9-5b71-54c1-b99e-4816f291982c", "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45"],
  ["93000888-2beb-56bc-91eb-49b4c42fe902", "https://images.unsplash.com/photo-1441974231531-c6227db76b6e"],
  ["8dfd19fa-b288-5828-8f50-96ae5def9cf5", "https://images.unsplash.com/photo-1500534623283-312aade485b7"],
  ["03371f2f-6451-5ac8-9157-f3db91efb9a6", "https://images.unsplash.com/photo-1558788353-f76d92427f16"],
  ["dd19150f-36c0-5e29-aa86-9491435b04b2", "https://images.unsplash.com/photo-1587300003388-59208cc962cb"],
  ["2a835c16-6cf1-5f97-8e98-d8a47efa7147", "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d"],
  ["ce5f0df2-8228-53c3-b332-2617e3d0febb", "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d"],
  ["70fab016-9aa2-5652-b620-3737711ae1af", "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267"],
  ["39069bf2-1485-5b6e-a85c-d01bd9a6da15", "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267"],
  ["00f031d9-9665-5f0d-a16b-8f0a0de42f8d", "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a"],
  ["f4e4a7ab-0b02-5808-b09a-ba08db233554", "https://images.unsplash.com/photo-1529156069898-49953e39b3ac"],
  ["02d6fcb4-a579-5be4-9e40-a46470326df3", "https://images.unsplash.com/photo-1546519638-68e109498ffc"],
  ["a6c754d3-16c5-5231-8fdd-e3f76ffe4138", "https://images.unsplash.com/photo-1546519638-68e109498ffc"],
  ["8a79bfc0-5ed9-5ea8-a16c-eab4c508ab34", "https://images.unsplash.com/photo-1500375592092-40eb2168fd21"],
  ["888a1775-4aa1-59c4-a2e6-de1191751aaa", "https://images.unsplash.com/photo-1500375592092-40eb2168fd21"],
  ["efc86355-5734-5f83-8a01-ddf5a1843fdf", "https://unsplash.com/photos/elderly-couple-waving-hello-in-a-room-w1eDyNeSMi0/download"],
  ["6c93dd46-bd73-5160-ad1a-e63ece2ffa08", "https://unsplash.com/photos/caregiver-assisting-elderly-couple-with-coloring-bSXk1lOp8T0/download"],
  ["9e1adec1-2fb5-5e30-9c13-acb9f8ce76d3", "https://images.unsplash.com/photo-1559027615-cd4628902d4a"],
  ["0597f887-427d-591e-ae7b-5e2b9ee1044d", "https://images.unsplash.com/photo-1531058020387-3be344556be6"],
 ]);

export function nativeEditorialMediaUrl(assetId: string): string | undefined {
  return editorialMedia.get(assetId);
}
