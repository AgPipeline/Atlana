"""Contains workflow definitions"""

WORKFLOW_DEFINTIONS = [
{
  'name': 'Canopy Cover',
  'description': 'Plot level canopy cover calculation',
  'id': 1,
  'steps': [{
    'name': 'Mask Soil on Image',
    'description': 'Masks soil from a copy of an image',
    'algorithm': 'RGBA File',
    'command': 'soilmask',
    'fields': [{
      'name': 'image',
      'visibility':  'ui',
      'prompt': 'Image file',
      'description': 'Source image to process',
      'type': 'file',
      'mandatory': True,
    }],   # End  of fields
    'results': [{
      'name': 'Soil masked image',
      'type': 'file',
      'restricted': False,
    }]    # End of results
  }, {
    'name': 'Plot Clip',
    'description': 'Clips image to plot',
    'algorithm': 'RGBA File',
    'command': 'plotclip',
    'fields': [{
      'name': 'geometries',
      'visibility': 'ui',
      'prompt': 'GeoJSON file',
      'description': 'GeoJSON file containing plot geometries',
      'type': 'file',
      'mandatory': True,
      }, {
      'name': 'image',
      'visibility': 'server',
      'description': 'Source image to process',
      'type': 'file',
      'mandatory': True,
      'prev_command_path': 'file:0:path',
    }],   # End  of fields
    'results': [{
      'name': 'Image clipped to plots',
      'type': 'folder',
      'restricted': False,
    }]    # End of results
  }, {
    'name': 'Find files',
    'command': 'find_files2json',
    'fields': [{
      'name': 'file_name',
      'visibility': 'server',
      'description': 'File name to find',
      'type': 'string',
      'mandatory': True,
      'prev_command_path': 'file_name',
      }, {
      'name': 'top_path',
      'visibility': 'server',
      'description': 'Top level folder to search on',
      'type': 'folder',
      'mandatory': True,
      'prev_command_path': 'top_path',
    }],   # End  of fields
    'results': [{
      'name': 'Found files JSON file',
      'type': 'file',
      'restricted': True,
    }]    # End of results
  }, {
    'name': 'Canopy Cover',
    'description': 'Calculate canopy cover on images',
    'algorithm': 'RGBA Plot',
    'command': 'canopycover',
    'fields': [{
      'name': 'experimentdata',
      'visibility': 'ui',
      'prompt': 'Experiment file',
      'description': 'YAML file containing experiment data',
      'type': 'file',
      'mandatory': False,
      }, {
      'name': 'found_json_file',
      'visibility': 'server',
      'description': 'JSON file containing information on files to process',
      'type': 'file',
      'mandatory': True,
      'prev_command_path': 'found_json_file',
      }, {
      'name': 'results_search_folder',
      'visibility': 'server',
      'description': 'Search path as it appears in the results',
      'type': 'string',
      'mandatory': True,
      'prev_command_path': 'results_search_folder',
    }],   # End  of fields
    'results': [{
      'name': 'Canopy cover calculation per plot',
      'type': 'folder',
      'restricted': False,
    }]    # End of results
  }, {
    'name': 'Merge CSV',
    'command': 'merge_csv',
    'fields': [{
      'name': 'top_path',
      'visibility': 'server',
      'description': 'Top level folder to search on',
      'type': 'folder',
      'mandatory': True,
      'prev_command_path': 'top_path',
    }],   # End  of fields
    'results': [{
      'name': 'Canopy cover calculation file',
      'type': 'file',
      'restricted': False,
    }]    # End of results
  }]  # End of steps
}, {
  'name': 'Ratio Canopy Cover',
  'description':  'Plot level canopy cover calculation using a ratio-based soil mask',
  'id': 2,
  'steps': [{
    'name': 'Mask Soil on Image',
    'description': 'Masks soil from a copy of an image using a green-to-red ratio',
    'algorithm': 'RGBA File',
    'command': 'soilmask_ratio',
    'fields': [{
      'name': 'image',
      'visibility':  'ui',
      'prompt': 'Image',
      'description': 'Source image to process',
      'type': 'file',
      'mandatory': True,
    }, {
      'name': 'ratio',
      'visibility': 'ui',
      'prompt': 'Ratio',
      'description': 'Lower bound of green:red ratio for non-soil pixels',
      'type': 'float',
      'lowerbound': 0.0,
      'upperbound': 255.0,
      'default': 1.0,
    }],   # End  of fields
    'results': [{
      'name': 'Ratio soil masked image',
      'type': 'file',
      'restricted': False,
    }]    # End of results
  }, {
    'name': 'Plot Clip',
    'description': 'Clips image to plot',
    'algorithm': 'RGBA File',
    'command': 'plotclip',
    'fields': [{
      'name': 'geometries',
      'visibility': 'ui',
      'prompt': 'GeoJSON',
      'description': 'GeoJSON file containing plot geometries',
      'type': 'file',
      'mandatory': True,
      }, {
      'name': 'image',
      'visibility': 'server',
      'description': 'Source image to process',
      'type': 'file',
      'mandatory': True,
      'prev_command_path': 'file:0:path',
    }],   # End  of fields
    'results': [{
      'name': 'Image clipped to plots',
      'type': 'folder',
      'restricted': False,
    }]    # End of results
  }, {
    'name': 'Find files',
    'command': 'find_files2json',
    'fields': [{
      'name': 'file_name',
      'visibility': 'server',
      'description': 'File name to find',
      'type': 'string',
      'mandatory': True,
      'prev_command_path': 'file_name',
      }, {
      'name': 'top_path',
      'visibility': 'server',
      'description': 'Top level folder to search on',
      'type': 'folder',
      'mandatory': True,
      'prev_command_path': 'top_path',
    }],   # End  of fields
    'results': [{
      'name': 'Found files JSON file',
      'type': 'file',
      'restricted': True,
    }]    # End of results
  }, {
    'name': 'Canopy Cover',
    'description': 'Calculate canopy cover on images',
    'algorithm': 'RGBA Plot',
    'command': 'canopycover',
    'fields': [{
      'name': 'experimentdata',
      'visibility': 'ui',
      'prompt': 'Experiment file',
      'description': 'YAML file containing experiment data',
      'type': 'file',
      'mandatory': False,
      }, {
      'name': 'found_json_file',
      'visibility': 'server',
      'description': 'JSON file containing information on files to process',
      'type': 'file',
      'mandatory': True,
      'prev_command_path': 'found_json_file',
      }, {
      'name': 'results_search_folder',
      'visibility': 'server',
      'description': 'Search path as it appears in the results',
      'type': 'string',
      'mandatory': True,
      'prev_command_path': 'results_search_folder',
    }],   # End  of fields
    'results': [{
      'name': 'Canopy cover calculation per plot',
      'type': 'folder',
      'restricted': False,
    }]    # End of results
  }, {
    'name': 'Merge CSV',
    'command': 'merge_csv',
    'fields': [{
      'name': 'top_path',
      'visibility': 'server',
      'description': 'Top level folder to search on',
      'type': 'folder',
      'mandatory': True,
      'prev_command_path': 'top_path',
    }],   # End  of fields
    'results': [{
      'name': 'Canopy cover calculation file',
      'type': 'file',
      'restricted': False,
    }]    # End of results
  }]  # End of steps
},{
  'name': 'Greenness Levels',
  'description': 'Plot level greenness level calculations',
  'id': 3,
  'steps': [{
    'name': 'Mask Soil on Image',
    'description': 'Masks soil from a copy of an image',
    'algorithm': 'RGBA File',
    'command': 'soilmask',
    'fields': [{
      'name': 'image',
      'visibility':  'ui',
      'prompt': 'Image file',
      'description': 'Source image to process',
      'type': 'file',
      'mandatory': True,
    }],   # End  of fields
    'results': [{
      'name': 'Soil masked image',
      'type': 'file',
      'restricted': False,
    }]    # End of results
  }, {
    'name': 'Plot Clip',
    'description': 'Clips image to plot',
    'algorithm': 'RGBA File',
    'command': 'plotclip',
    'fields': [{
      'name': 'geometries',
      'visibility': 'ui',
      'prompt': 'GeoJSON file',
      'description': 'GeoJSON file containing plot geometries',
      'type': 'file',
      'mandatory': True,
      }, {
      'name': 'image',
      'visibility': 'server',
      'description': 'Source image to process',
      'type': 'file',
      'mandatory': True,
      'prev_command_path': 'file:path',
    }],   # End  of fields
    'results': [{
      'name': 'Image clipped to plots',
      'type': 'folder',
      'restricted': False,
    }]    # End of results
  }, {
    'name': 'Find files',
    'command': 'find_files2json',
    'fields': [{
      'name': 'file_name',
      'visibility': 'server',
      'description': 'File name to find',
      'type': 'string',
      'mandatory': True,
      'prev_command_path': 'file_name',
      }, {
      'name': 'top_path',
      'visibility': 'server',
      'description': 'Top level folder to search on',
      'type': 'folder',
      'mandatory': True,
      'prev_command_path': 'top_path',
    }],   # End  of fields
    'results': [{
      'name': 'Found files JSON file',
      'type': 'file',
      'restricted': True,
    }]    # End of results
  }, {
    'name': 'Greenness Indices',
    'description': 'Calculate greenness indicies on images',
    'algorithm': 'RGBA Plot',
    'command': 'greenness_indices',
    'fields': [{
      'name': 'experimentdata',
      'visibility': 'ui',
      'prompt': 'Experiment file',
      'description': 'YAML file containing experiment data',
      'type': 'file',
      'mandatory': False,
      }, {
      'name': 'found_json_file',
      'visibility': 'server',
      'description': 'JSON file containing information on files to process',
      'type': 'file',
      'mandatory': True,
      'prev_command_path': 'found_json_file',
      }, {
      'name': 'results_search_folder',
      'visibility': 'server',
      'description': 'Search path as it appears in the results',
      'type': 'string',
      'mandatory': True,
      'prev_command_path': 'results_search_folder',
    }],   # End  of fields
    'results': [{
      'name': 'Greeenness indices calculation per plot',
      'type': 'folder',
      'restricted': False,
    }]    # End of results
  }, {
    'name': 'Merge CSV',
    'command': 'merge_csv',
    'fields': [{
      'name': 'top_path',
      'visibility': 'server',
      'description': 'Top level folder to search on',
      'type': 'folder',
      'mandatory': True,
      'prev_command_path': 'top_path',
    }],   # End  of fields
    'results': [{
      'name': 'Calculated greenness indices file',
      'type': 'file',
      'restricted': False,
    }]    # End of results
  }]  # End of steps
}, {
  'name': 'Ratio Greenness Levels',
  'description':  'Plot level greenness levels calculation using a ratio-based soil mask',
  'id': 4,
  'steps': [{
    'name': 'Mask Soil on Image',
    'description': 'Masks soil from a copy of an image using a green-to-red ratio',
    'algorithm': 'RGBA File',
    'command': 'soilmask_ratio',
    'fields': [{
      'name': 'image',
      'visibility':  'ui',
      'prompt': 'Image',
      'description': 'Source image to process',
      'type': 'file',
      'mandatory': True,
    }, {
      'name': 'ratio',
      'visibility': 'ui',
      'prompt': 'Ratio',
      'description': 'Lower bound of green:red ratio for non-soil pixels',
      'type': 'float',
      'lowerbound': 0.0,
      'upperbound': 255.0,
      'default': 1.0,
    }],   # End  of fields
    'results': [{
      'name': 'Ratio soil masked image',
      'type': 'file',
      'restricted': False,
    }]    # End of results
  }, {
    'name': 'Plot Clip',
    'description': 'Clips image to plot',
    'algorithm': 'RGBA File',
    'command': 'plotclip',
    'fields': [{
      'name': 'geometries',
      'visibility': 'ui',
      'prompt': 'GeoJSON',
      'description': 'GeoJSON file containing plot geometries',
      'type': 'file',
      'mandatory': True,
      }, {
      'name': 'image',
      'visibility': 'server',
      'description': 'Source image to process',
      'type': 'file',
      'mandatory': True,
      'prev_command_path': 'file:path',
    }],   # End  of fields
    'results': [{
      'name': 'Image clipped to plots',
      'type': 'folder',
      'restricted': False,
    }]    # End of results
  }, {
    'name': 'Find files',
    'command': 'find_files2json',
    'fields': [{
      'name': 'file_name',
      'visibility': 'server',
      'description': 'File name to find',
      'type': 'string',
      'mandatory': True,
      'prev_command_path': 'file_name',
      }, {
      'name': 'top_path',
      'visibility': 'server',
      'description': 'Top level folder to search on',
      'type': 'folder',
      'mandatory': True,
      'prev_command_path': 'top_path',
    }],   # End  of fields
    'results': [{
      'name': 'Found files JSON file',
      'type': 'file',
      'restricted': True,
    }]    # End of results
  }, {
    'name': 'Greenness Indices',
    'description': 'Calculate greenness indicies on images',
    'algorithm': 'RGBA Plot',
    'command': 'greenness_indices',
    'fields': [{
      'name': 'experimentdata',
      'visibility': 'ui',
      'prompt': 'Experiment file',
      'description': 'YAML file containing experiment data',
      'type': 'file',
      'mandatory': False,
      }, {
      'name': 'found_json_file',
      'visibility': 'server',
      'description': 'JSON file containing information on files to process',
      'type': 'file',
      'mandatory': True,
      'prev_command_path': 'found_json_file',
      }, {
      'name': 'results_search_folder',
      'visibility': 'server',
      'description': 'Search path as it appears in the results',
      'type': 'string',
      'mandatory': True,
      'prev_command_path': 'results_search_folder',
    }],   # End  of fields
    'results': [{
      'name': 'Greeenness indices calculation per plot',
      'type': 'folder',
      'restricted': False,
    }]    # End of results
  }, {
    'name': 'Merge CSV',
    'command': 'merge_csv',
    'fields': [{
      'name': 'top_path',
      'visibility': 'server',
      'description': 'Top level folder to search on',
      'type': 'folder',
      'mandatory': True,
      'prev_command_path': 'top_path',
    }],   # End  of fields
    'results': [{
      'name': 'Calculated greenness indices file',
      'type': 'file',
      'restricted': False,
    }]    # End of results
  }]  # End of steps
}
]