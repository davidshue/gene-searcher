package com.genom

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestMethod
/**
 * Created by dshue1 on 9/8/16.
 */
@Controller
class HomeController {
	@Autowired
	private DataBootstrapper bootstrapper

	@RequestMapping(value = '/', method = RequestMethod.GET)
	String home(Model model) {
		model.addAttribute("searchBean", new SearchBean())
		'index'
	}
	@RequestMapping(value = '/', method = RequestMethod.POST)
	String search(@ModelAttribute('searchBean') SearchBean searchBean, Model model) {
		model.addAttribute("searchBean", searchBean)
		Tuple2<List<String>, List<List<String>>> tuple = bootstrapper.getGenePage(searchBean.q)
		model.addAttribute("resultTitles", tuple.first)
		model.addAttribute("resultValues", tuple.second)
		'index'
	}
}
