import { loadDbJson } from './utils'

export class LowCodeService {

    async list(body) {
        const list = await loadDbJson('low-code.connection.json', [])
        return {
            total: list.length,
            list: list,
        }
    }

    async detail(body) {
        const { id } = body
        const list = await loadDbJson('low-code.connection.json', [])
        return list.find(item => item.id == id)
    }
}
