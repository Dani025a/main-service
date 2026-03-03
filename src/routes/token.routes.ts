import { Router } from "express";
import { tokenController } from "../controllers/token.controller.js";

export const tokenRoutes = Router();


tokenRoutes.post("/token", tokenController.issue);
