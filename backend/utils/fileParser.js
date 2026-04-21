const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const iconv = require('iconv-lite');
const xlsx = require('xlsx');

class FileParser {
  /**
   * 检测文件编码
   * @param {Buffer} buffer 
   * @returns {string} 编码类型
   */
  static detectEncoding(buffer) {
    // 简单的编码检测逻辑
    try {
      // 尝试UTF-8
      const utf8Text = buffer.toString('utf8');
      if (!utf8Text.includes('�')) {
        return 'utf8';
      }
    } catch (e) {
      // 忽略错误
    }

    // 尝试GBK
    try {
      const gbkText = iconv.decode(buffer, 'gbk');
      if (!gbkText.includes('�')) {
        return 'gbk';
      }
    } catch (e) {
      // 忽略错误
    }

    // 默认返回UTF-8
    return 'utf8';
  }

  /**
   * 解析TAB分隔的TXT文件
   * @param {string} filePath 
   * @param {Array} expectedHeaders 预期的表头
   * @returns {Array} 解析后的数据数组
   */
  static parseTxtFile(filePath, expectedHeaders = null) {
    try {
      const buffer = fs.readFileSync(filePath);
      const encoding = this.detectEncoding(buffer);
      let content = iconv.decode(buffer, encoding);
      
      // 处理不同的行尾符
      content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        throw new Error('文件为空');
      }

      // 解析表头
      const headers = lines[0].split('\t').map(h => h.trim());
      
      console.log(`[FileParser] parseTxtFile: headers=${JSON.stringify(headers)}`);
      console.log(`[FileParser] parseTxtFile: expectedHeaders=${JSON.stringify(expectedHeaders)}`);
      
      // 检测是否为中文表头文件
      const isChineseHeader = headers.some(header => 
        header.includes('ASIN') || header.includes('标题') || header.includes('会话') || header.includes('页面') || 
        header.includes('SKU') || header.includes('转化率') || header.includes('推荐报价') || header.includes('已订购')
      );
      
      if (isChineseHeader) {
        console.log(`[FileParser] 检测到中文表头，跳过表头验证`);
        // 中文表头文件不需要验证英文表头
        expectedHeaders = null;
      }
      
      // 验证表头（如果提供了预期表头）
      if (expectedHeaders && expectedHeaders.length > 0) {
        console.log(`[FileParser] 进行表头验证，预期表头: ${JSON.stringify(expectedHeaders)}`);
        const missingHeaders = expectedHeaders.filter(h => 
          !headers.some(header => header.toLowerCase().includes(h.toLowerCase()))
        );
        
        if (missingHeaders.length > 0) {
          console.log(`[FileParser] 缺少表头: ${missingHeaders.join(', ')}`);
          throw new Error(`文件缺少必要的表头: ${missingHeaders.join(', ')}`);
        }
        console.log(`[FileParser] 表头验证通过`);
      } else {
        console.log(`[FileParser] 跳过表头验证 (expectedHeaders为空或中文表头)`);
      }

      // 解析数据行
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = line.split('\t').map(v => v.trim());
        
        // 确保每行数据与表头数量一致
        if (values.length !== headers.length) {
          // 尝试处理包含制表符的字段
          if (values.length < headers.length) {
            // 填充缺失的值
            while (values.length < headers.length) {
              values.push('');
            }
          } else {
            // 合并多余的值到最后一个字段
            const lastValue = values.slice(headers.length - 1).join('\t');
            values.splice(headers.length - 1);
            values.push(lastValue);
          }
        }
        
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        data.push(row);
      }

      return {
        headers,
        data,
        total: data.length
      };
    } catch (error) {
      throw new Error(`解析TXT文件失败: ${error.message}`);
    }
  }

  /**
   * 解析CSV文件
   * @param {string} filePath 
   * @param {Array} expectedHeaders 预期的表头
   * @returns {Array} 解析后的数据数组
   */
  static parseCsvFile(filePath, expectedHeaders = null) {
    try {
      const buffer = fs.readFileSync(filePath);
      const encoding = this.detectEncoding(buffer);
      const content = iconv.decode(buffer, encoding);
      
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true
      });

      if (records.length === 0) {
        throw new Error('CSV文件没有数据');
      }

      const headers = Object.keys(records[0]);
      
      console.log(`[FileParser] parseCsvFile: headers=${JSON.stringify(headers)}`);
      console.log(`[FileParser] parseCsvFile: expectedHeaders=${JSON.stringify(expectedHeaders)}`);
      
      // 检测是否为中文表头文件
      const isChineseHeader = headers.some(header => 
        header.includes('ASIN') || header.includes('标题') || header.includes('会话') || header.includes('页面') || 
        header.includes('SKU') || header.includes('转化率') || header.includes('推荐报价') || header.includes('已订购')
      );
      
      console.log(`[FileParser] isChineseHeader检测结果: ${isChineseHeader}`);
      console.log(`[FileParser] 检测到的表头: ${JSON.stringify(headers)}`);
      console.log(`[FileParser] 传入的expectedHeaders: ${JSON.stringify(expectedHeaders)}`);
      console.log(`[FileParser] expectedHeaders类型: ${typeof expectedHeaders}, 长度: ${expectedHeaders ? expectedHeaders.length : 'null'}`);
      
      if (isChineseHeader) {
        console.log(`[FileParser] 检测到中文表头，跳过表头验证`);
        // 中文表头文件不需要验证英文表头
        expectedHeaders = null;
        console.log(`[FileParser] 设置expectedHeaders为: ${expectedHeaders}`);
      }
      
      // 验证表头（如果提供了预期表头）
      if (expectedHeaders && expectedHeaders.length > 0) {
        console.log(`[FileParser] 进行表头验证，预期表头: ${JSON.stringify(expectedHeaders)}`);
        const missingHeaders = expectedHeaders.filter(h => 
          !headers.some(header => header.toLowerCase().includes(h.toLowerCase()))
        );
        
        if (missingHeaders.length > 0) {
          console.log(`[FileParser] 缺少表头: ${missingHeaders.join(', ')}`);
          throw new Error(`CSV文件缺少必要的表头: ${missingHeaders.join(', ')}`);
        }
        console.log(`[FileParser] 表头验证通过`);
      } else {
        console.log(`[FileParser] 跳过表头验证 (expectedHeaders为空或中文表头)`);
      }
      
      return {
        headers,
        data: records,
        total: records.length
      };
    } catch (error) {
      throw new Error(`解析CSV文件失败: ${error.message}`);
    }
  }

  /**
   * 解析Excel文件（.xlsx, .xls）
   * @param {string} filePath
   * @param {Array} expectedHeaders 预期的表头
   * @returns {Array} 解析后的数据数组
   */
  static parseExcelFile(filePath, expectedHeaders = null) {
    try {
      // 读取Excel文件
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // 将工作表转换为JSON数组
      const data = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

      if (data.length === 0) {
        throw new Error('Excel文件没有数据');
      }

      const headers = Object.keys(data[0]);

      console.log(`[FileParser] parseExcelFile: headers=${JSON.stringify(headers)}`);
      console.log(`[FileParser] parseExcelFile: expectedHeaders=${JSON.stringify(expectedHeaders)}`);

      // 检测是否为中文表头文件
      const isChineseHeader = headers.some(header =>
        header.includes('ASIN') || header.includes('标题') || header.includes('会话') || header.includes('页面') ||
        header.includes('SKU') || header.includes('转化率') || header.includes('推荐报价') || header.includes('已订购')
      );

      if (isChineseHeader) {
        console.log(`[FileParser] 检测到中文表头，跳过表头验证`);
        // 中文表头文件不需要验证英文表头
        expectedHeaders = null;
      }

      // 验证表头（如果提供了预期表头）
      if (expectedHeaders && expectedHeaders.length > 0) {
        console.log(`[FileParser] 进行表头验证，预期表头: ${JSON.stringify(expectedHeaders)}`);
        const missingHeaders = expectedHeaders.filter(h =>
          !headers.some(header => header.toLowerCase().includes(h.toLowerCase()))
        );

        if (missingHeaders.length > 0) {
          console.log(`[FileParser] 缺少表头: ${missingHeaders.join(', ')}`);
          throw new Error(`Excel文件缺少必要的表头: ${missingHeaders.join(', ')}`);
        }
        console.log(`[FileParser] 表头验证通过`);
      } else {
        console.log(`[FileParser] 跳过表头验证 (expectedHeaders为空或中文表头)`);
      }

      return {
        headers,
        data,
        total: data.length
      };
    } catch (error) {
      throw new Error(`解析Excel文件失败: ${error.message}`);
    }
  }

  /**
   * 根据文件扩展名自动选择解析器
   * @param {string} filePath 
   * @param {Array} expectedHeaders 
   * @returns {Array} 解析后的数据
   */
  static autoParseFile(filePath, expectedHeaders = null) {
    console.log(`[FileParser] autoParseFile调用: filePath=${filePath}, expectedHeaders=${JSON.stringify(expectedHeaders)}`);
    const ext = path.extname(filePath).toLowerCase();
    console.log(`[FileParser] 文件扩展名: ${ext}`);
    
    if (ext === '.txt') {
      console.log(`[FileParser] 调用parseTxtFile`);
      return this.parseTxtFile(filePath, expectedHeaders);
    } else if (ext === '.csv') {
      console.log(`[FileParser] 调用parseCsvFile`);
      return this.parseCsvFile(filePath, expectedHeaders);
    } else if (ext === '.xlsx' || ext === '.xls') {
      console.log(`[FileParser] 调用parseExcelFile`);
      return this.parseExcelFile(filePath, expectedHeaders);
    } else {
      throw new Error(`不支持的文件格式: ${ext}`);
    }
  }

  /**
   * 验证SKU字段
   * @param {Array} data 
   * @param {string} skuField 
   * @returns {Object} 包含有效数据和无效数据的结果
   */
  static validateSkuData(data, skuField = 'seller-sku') {
    const validData = [];
    const invalidData = [];
    
    data.forEach((row, index) => {
      const sku = row[skuField] || row['seller_sku'] || row['sku'] || '';
      
      if (sku && sku.trim() !== '') {
        validData.push(row);
      } else {
        invalidData.push({
          row: index + 2, // 加上表头行
          data: row,
          error: 'SKU为空'
        });
      }
    });
    
    return { validData, invalidData };
  }

  /**
   * 生成错误报告文件
   * @param {Array} invalidData 
   * @param {string} outputDir 
   * @returns {string} 错误文件路径
   */
  static generateErrorFile(invalidData, outputDir) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const errorFilePath = path.join(outputDir, `errors_${timestamp}.csv`);
    
    const headers = ['行号', '错误信息', '数据'];
    const csvLines = [headers.join(',')];
    
    invalidData.forEach(item => {
      const rowData = JSON.stringify(item.data).replace(/"/g, '""');
      csvLines.push(`${item.row},"${item.error}","${rowData}"`);
    });
    
    fs.writeFileSync(errorFilePath, csvLines.join('\n'), 'utf8');
    return errorFilePath;
  }
}

module.exports = FileParser;