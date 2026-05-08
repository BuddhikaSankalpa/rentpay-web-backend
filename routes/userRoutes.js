import express from 'express';
import { 
    createUser, 
    deleteUser, 
    loginUser, 
    updateUser, 
    toggleBlockUser, 
    getUser, 
    getAllUsers 
} from '../controllers/userController.js';

import authenticate from '../middlewares/authenticate.js';

const userRouter = express.Router();

userRouter.post("/", createUser);
userRouter.post("/login", loginUser);
userRouter.get("/all", authenticate, getAllUsers);

userRouter.delete("/:email", authenticate, deleteUser);
userRouter.put("/:email", authenticate, updateUser);
userRouter.get("/:email", authenticate, getUser);
userRouter.patch("/:email/block", authenticate, toggleBlockUser);

export default userRouter;