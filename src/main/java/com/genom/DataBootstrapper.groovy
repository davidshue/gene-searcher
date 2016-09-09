package com.genom

import javax.annotation.PostConstruct

import org.springframework.core.io.ClassPathResource
import org.springframework.stereotype.Component

/**
 * Created by dshue1 on 9/8/16.
 */
@Component
class DataBootstrapper {
	private Map<String, List<Map<String, String>>> data = [:]
	@PostConstruct
	void afterInit() {
		def file = new ClassPathResource('/variant_results.tsv').file
		def names = []
		file.readLines().eachWithIndex{line, index ->
			if (index == 0) {
				names = line.split('\t')
			}
			else {
				def values = line.split('\t')

				def gene = values[0]

				def geneList = data.get(gene, [])

				def attrMap = [:]
				geneList << attrMap

				values.eachWithIndex {value, column ->
					attrMap.put(names[column], values[column])
				}
			}
		}
	}

	Tuple2<List<String>, List<List<String>>> getGenePage(String gene) {
		List<Map<String, String>> geneData = data[gene]
		if (!geneData) return new Tuple2<>([], [])

		def result = new Tuple2<>([], [].withDefault{[]})
		geneData.eachWithIndex{ Map<String, String> entry, int index ->
			entry.each {String k, String v ->
				if (!index) {
					result.first << k
				}
				result.second[index] << v
			}

		}

		return result
	}

	List<Map<String, String>> getGeneData(String gene) {
		return data[gene]
	}

	List<String> searchGenes(String genes) {
		def output = []
		if (!genes) {
			return output
		}
		data.keySet().inject(output){result, it ->
			if (it.startsWith(genes)) {
				result << it
			}
			result
		}
		output
	}
}
