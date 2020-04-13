const express = require('express')
const router = express.Router()

const PageModel = require('../models/page')
const ActivityModel = require('../models/activity')
const { checkLogin, clearCookie } = require('../middlewares/check')
const { cacheUser } = require('../cache/user')

router.post('/new', checkLogin, async (req, res) => { // 新建文章
    try {
        const create_time = new Date().toLocaleString()
        const update_time = new Date().toLocaleString()
        const title = req.body.title
        const content = req.body.content
        const create_user = cacheUser.getUserName()
        const status = req.body.status
        const secret = req.body.secret
        const tags = req.body.tags
        let page = {
            title,
            tags,
            content,
            create_user,
            create_time,
            update_time,
            status,
            secret
        }
        const result = await PageModel.create(page)
        await ActivityModel.create({ type: 'page', id: result._id, create_time: result.create_time, update_time: result.update_time, create_user: result.create_user })

        const [page_num, draft_num] = await Promise.all([
            PageModel.getPageNum({ type: 'create_user', content: create_user, status: 'normal' }),
			      PageModel.getPageNum({ type: 'create_user', content: create_user, status: 'draft' })
        ])
        res.status(200).json({ code: 'OK', data: { page_num, draft_num, id: result._id }})
    } catch (e) {
        res.status(200).json({ code: 'ERROR', data: e.message })
    }

})
router.post('/edit', checkLogin, async (req, res) => { // 编辑文章
    try {
        const id = req.body.id
        const update_time = new Date()
        const title = req.body.title
        const content = req.body.content
        const create_user = cacheUser.getUserName()
        const status = req.body.status
        const secret = req.body.secret
        const tags = req.body.tags
        let page = {
            title,
            content,
            update_time,
            status,
            secret,
            tags
        }
        const result = await PageModel.update(id, page)
        await ActivityModel.create({ type: 'page', id: result._id, create_time: result.create_time, update_time: result.update_time, create_user: result.create_user })
        const [page_num, draft_num] = await Promise.all([
            PageModel.getPageNum({ type: 'create_user', content: create_user, status: 'normal' }),
			      PageModel.getPageNum({ type: 'create_user', content: create_user, status: 'draft' })
        ])
        res.status(200).json({ code: 'OK', data: { page_num, draft_num, id }})
    } catch (e) {
        res.status(200).json({ code: 'ERROR', data: e.message })
    }

})
router.post('/detail', clearCookie, async (req, res, next) => { // 获取文章详情
    try {
        const id = req.body.id
        let result = await PageModel.getPageById(id)
        res.status(200).json({ code: 'OK', data: result })
    } catch (e) {
        res.status(200).json({ code: 'ERROR', data: e.message })
    }
})
/**
 * @params {number} req.body.pageSize-每页大小
 * @params {number} req.body.page-页码
 * @params {number} req.body.type
 * @params {number} req.body.content
 * @params {number} req.body.status
 * @params {number} req.body.secret
*/
router.post('/pagelist', clearCookie, async (req, res, next) => { // 获取文章列表
    let pageSize = req.body.pageSize || 10
    let page = req.body.page || 1
    const type = req.body.type
    const content = req.body.content
    const status = req.body.status
    const secret = req.body.secret
    const sort = req.body.sort || 'create_time'
    pageSize = typeof (pageSize) === 'number' ? pageSize : parseInt(pageSize)
    page = typeof (page) === 'number' ? page : parseInt(page)
    const Count =  pageSize * (page - 1)
    try {
        let [total, result] = await Promise.all([
            PageModel.getPageNum({ type, content, status, secret }),
            PageModel.getPageList({ type, content, status, pageSize, Count, secret, sort })
        ])
        res.status(200).json({ code: 'OK', data: { result, total }})
    } catch (e) {
        res.status(200).json({ code: 'ERROR', data: e.message })
    }
})
router.post('/searchpage', clearCookie, async (req, res, next) => { // 模糊搜索
    const keywords = req.body.keywords || ''
    let page = req.body.page || 1
    let pageSize = req.body.pageSize || 999
    pageSize = typeof (pageSize) === 'number' ? pageSize : parseInt(pageSize)
    page = typeof (page) === 'number' ? page : parseInt(page)
    const Count =  pageSize * (page - 1)
    try {
        let [total, result] = await Promise.all([
            PageModel.searchPageNum({ keywords }),
            PageModel.searchPage({ keywords, Count, pageSize })
        ]) 
        res.status(200).json({ code: 'OK', data: { result, total } })
    } catch (e) {
        res.status(200).json({ code: 'ERROR', data: e.message })
    }
})
router.post('/limitpagelist', checkLogin, async (req, res, next) => { // 根据条件获取文章列表，必须登录
    let pageSize = req.body.pageSize || 10
    let page = req.body.page || 1
    const type = req.body.type
    const content = req.body.content
    const status = req.body.status
    const secret = req.body.secret
    const sort = req.body.sort || 'create_time'
    pageSize = typeof (pageSize) === 'number' ? pageSize : parseInt(pageSize)
    page = typeof (page) === 'number' ? page : parseInt(page)
    const Count =  pageSize * (page - 1)
    try {
        let [total, result] = await Promise.all([
            PageModel.getPageNum({ type, content, status, secret }),
            PageModel.getPageList({ type, content, status, pageSize, Count, secret, sort })
        ])
        res.status(200).json({ code: 'OK', data: { result, total }})
    } catch (e) {
        res.status(200).json({ code: 'ERROR', data: e.message })
    }
})

router.post('/addcomment', checkLogin, async (req, res, next) => { // 保存评论
    const comment = req.body.comment
    const create_user = req.body.create_user
    const id = req.body.id
    const create_time = new Date()
    try {
        let total = await PageModel.addPageComment(id, { comment, create_user, create_time })
        res.status(200).json({ code: 'OK', data: '留言提交成功!' })
    } catch (e) {
        res.status(200).json({ code: 'ERROR', data: e.message })
    }
})
router.post('/getcomments', clearCookie, async (req, res, next) => {
    const id = req.body.id
    try {
        let comments = (await PageModel.getPageById(id)).comments
        res.status(200).json({ code: 'OK', data: { result: comments }})
    } catch (e) {
        res.status(200).json({ code: 'ERROR', data: e.message })
    }
})
module.exports = router