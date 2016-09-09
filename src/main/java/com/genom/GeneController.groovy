package com.genom

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestMethod
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * Created by dshue1 on 9/8/16.
 */
@RestController
class GeneController {
	@Autowired
	private DataBootstrapper bootstrapper

	@RequestMapping(value='/api/v1/variants', method = RequestMethod.GET)
	Object gene(@RequestParam(name='q') String q) {
		bootstrapper.getGeneData(q)
	}

	@RequestMapping(value='/api/v1/suggest', method = RequestMethod.GET)
	Object suggest(@RequestParam(name='genes', required = false) String genes) {
		bootstrapper.searchGenes(genes)
	}
}
