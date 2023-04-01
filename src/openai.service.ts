import { loadDbJson } from './utils'

export class OpenAiService {

    async info(body) {
        const info = await loadDbJson('openai.json', {})
        return info
    }
}
