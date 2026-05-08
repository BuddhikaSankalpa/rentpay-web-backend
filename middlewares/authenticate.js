import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export default function authenticate(req, res, next) {
    const header = req.header("Authorization");

    if (header == null) {
        return res.status(401).json({ message: "No token provided, please login" });
    }

    const token = header.replace("Bearer ", "");

    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
        if (err || !decoded) {
            return res.status(401).json({ message: "Invalid token, please login again" });
        }
        req.user = decoded;
        next();
    });
}


// import jwt from "jsonwebtoken"
// import dotenv from "dotenv"
// dotenv.config()

// export default function authenticate(req, res, next) {

//     const header = req.header("Authorization")

//     if (header == null) {
//         return res.status(401).json({ message: "No token provided, please login" })
//     } else {

//         const token = header.replace("Bearer ", "")

//         jwt.verify(token, process.env.JWT_SECRET_KEY,
            
//             (err, decoded) => {

//                 if (decoded == null) {
//                     return res.status(401).json({ message: "Invalid token please login again" })
//                 } else {
//                     req.user = decoded
//                     next()
//                 }

//             }
//         )
//     }
// }