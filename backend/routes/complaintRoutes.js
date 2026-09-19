import express from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { getComplaints, getComplaintById, createComplaint, updateComplaint, deleteComplaint } from '../controllers/complaintController.js'

const router = express.Router()

router.get('/', authenticate, getComplaints)
router.get('/:id', authenticate, getComplaintById)
router.post('/', authenticate, createComplaint)
router.put('/:id', authenticate, updateComplaint)
router.delete('/:id', authenticate, deleteComplaint)

export default router
