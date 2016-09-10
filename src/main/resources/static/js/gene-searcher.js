$(document).ready(function(){
	$('input.main-search').typeahead(
		{
			hint: true,
			highlight: true,
			minLength: 2
		},
		{
			source: function(query, processSync, processAsync) {
				return $.ajax({
					url: '/api/v1/suggest',
					type: 'get',
					data: {genes: query},
					dataType: 'json',
					success: function(json) {
						return processAsync(json);
					}
				});
			}
		}
	);
});
