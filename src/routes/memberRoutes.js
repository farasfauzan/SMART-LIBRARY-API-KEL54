import express from 'express';
import { MemberController } from '../controllers/memberController.js';

const router = express.Router();
router.get('/', MemberController.getAllMembers);
router.post('/', MemberController.registerMember);
export default router;