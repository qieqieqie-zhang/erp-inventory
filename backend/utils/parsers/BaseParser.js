/**
 * 物流解析器基类
 * 所有物流解析器需要继承此类并实现相应方法
 */
class BaseParser {
  /**
   * 解析器名称
   */
  static name = 'base'

  /**
   * 解析器描述
   */
  static description = '基础解析器'

  /**
   * 检测文件是否适用于此解析器
   * @param {Object} parsedData - FileParser解析后的数据
   * @param {Object} rawData - 原始Excel数据(可选)
   * @returns {boolean}
   */
  static detect(parsedData, rawData) {
    return false
  }

  /**
   * 解析数据
   * @param {Object} parsedData - FileParser解析后的数据
   * @param {Object} options - 解析选项 { shopId, filePath }
   * @returns {Array} 解析后的物流记录数组
   */
  static parse(parsedData, options) {
    throw new Error('parse方法需要被子类实现')
  }
}

module.exports = BaseParser
