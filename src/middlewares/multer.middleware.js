import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp"); //location where file will be stored.
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname);
  },
});

export const upload = multer({ storage: storage });
