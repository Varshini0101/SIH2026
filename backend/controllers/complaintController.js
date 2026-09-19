import {
  getComplaints as getComplaintRecords,
  getComplaintById as getComplaintRecordById,
  createComplaintRecord,
  updateComplaintRecord,
  deleteComplaintRecord
} from '../services/databaseService.js'

export const getComplaints = async (req, res) => {
  try {
    const results = await getComplaintRecords(req.query)
    return res.json(results)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load complaints' })
  }
}

export const getComplaintById = async (req, res) => {
  const { id } = req.params

  try {
    const complaint = await getComplaintRecordById(id)

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' })
    }

    return res.json(complaint)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch complaint' })
  }
}

export const createComplaint = async (req, res) => {
  try {
    const complaint = await createComplaintRecord(req.body)
    return res.status(201).json(complaint)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create complaint' })
  }
}

export const updateComplaint = async (req, res) => {
  const { id } = req.params

  try {
    const complaint = await updateComplaintRecord(id, req.body)

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' })
    }

    return res.json(complaint)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update complaint' })
  }
}

export const deleteComplaint = async (req, res) => {
  const { id } = req.params

  try {
    const result = await deleteComplaintRecord(id)

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Complaint not found' })
    }

    return res.json({ message: 'Complaint deleted successfully' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete complaint' })
  }
}
