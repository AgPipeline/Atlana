/**
 * @fileoverview Implementation of file & folder listing
 * @author schnaufer@arizona.edu (Chris Schnaufer)
 */
import { Component } from 'react';
import './AFilesList.css';

/**
 * The order of these fields is important, see titleSortInd() and title_sort_map
 */
var file_display_titles = ['Name', 'Timestamp', 'Size'];
var sort_column_id = {
  name: 1,
  date: 2,
  size: 3,
};

/**
 * Map the index of a title to the sort_column_id
 */
var title_sort_map = {0: sort_column_id.name, 1: sort_column_id.date, 2: sort_column_id.size};

/**
 * Handles displaying and sorting the contents of a folder
 * @extends Component
 */
class AFilesList extends Component {

  /**
   * Class instance initialization
   * @props {Object} props - the properties of the class instance
   */
  constructor(props) {
    super(props);

    this.displayPathItem = this.displayPathItem.bind(this);
    this.sortByDate = this.sortByDate.bind(this);
    this.sortByName = this.sortByName.bind(this);
    this.sortResults = this.sortResults.bind(this);
    this.sortBySize = this.sortBySize.bind(this);
    this.titleClicked = this.titleClicked.bind(this);
    this.titleSortInd = this.titleSortInd.bind(this);
    
    let cur_contents = this.sortResults(this.normalizeResults(this.props.contents), sort_column_id.name, true);
    const found_item = cur_contents.find((item) => item.path === this.props.path);
    let cur_is_file = false;
    if (found_item) {
      cur_is_file = found_item.type === 'file';
    }

    const cur_file_name = cur_is_file ? this.getFilename(this.props.path) : undefined;

    this.state = {
      cur_path: this.props.path,          // The working path
      cur_file_name,                      // The current name of the file (used for selection indicator)
      is_file: cur_is_file,               // Flag for selection being a file or not
      sort_column: sort_column_id.name,   // Current column being sorted on
      sort_ascending: true,               // Flag for sort direction
      path_contents: cur_contents,        // Folder contents
    };
  }

  /**
   * Called when the component is updated while being displayed
   * @param {Object} prev_props - the previous set of properties
   * @param {string} prev_props.path - the previous path
   * @param {Object[]} prev_props.contents - the previous contents of prev_props.path
   */
  componentDidUpdate(prev_props) {
    if ((prev_props.path !== this.props.path) || ((prev_props.contents === null) && (this.props.contents !== null))) {
      const cur_item = this.props.contents.find((item) => item.path === this.props.path);
      const is_path = !this.props.is_file;
      const cur_is_file = (!is_path) || (cur_item && cur_item.type !== undefined && cur_item.type === 'file' ? true : false);
      const cur_file_name = cur_is_file ? this.getFilename(this.props.path) : undefined;
      const sorted_contents = this.sortResults(this.normalizeResults(this.props.contents), this.state.sort_column, this.state.sort_ascending);

      this.setState({cur_path: this.props.path, cur_file_name, is_file: cur_is_file,
                     path_contents: sorted_contents});
    }
  }

  /**
   * Returns the UI of a single file or folder
   * @param {Object} item - the file or folder item to display
   * @param {string} item.date - the date of the item
   * @param {string} item.name - the name of this item
   * @param {string} item.path - the full path of this item
   * @param {int} item.size - the size of this item
   * @param {string} item.type - one of 'file' or 'folder'
   * @oaram {int|string} idx - the index associated with the file/folder item
   */
  displayPathItem(item, idx) {
    const item_class_name = item.type ==='file' ? 'files-list-display-file' : 'files-list-display-folder';
    let row_class_name = 'files-list-display-item-row';
    const image_source = item.type ==='file' ? 'file_image.png' : 'folder_image.png';
    const click_cb = item.type ==='file' ?  () => this.props.file_sel(item.path) : () => this.props.folder_sel(item.path);
    const item_size = item.type ==='file' ? item.size : '';
    const item_selected = item.name === this.state.cur_file_name;

    if (item_selected) {
      row_class_name += ' files-list-display-file_selected';
    }

    return (
      <tr className={row_class_name} key={'row_' + item.name} >
        <td id={'files_list_' + idx + '_display-item-wrapper'} className="files-list-path-item" onClick={click_cb}>
          <div className="files-list-display-file-wrapper">
            <img src={image_source} alt=""/>
            <div id={idx + '_' + item.name} key={item.name} className={'files-list-path-display-item ' + item_class_name}>{item.name}</div>
          </div>
        </td>
        <td id={'files_list_' + idx + '_display_item_date'} className="files-list-path-item files-list-display-date">
          {item.date}
        </td>
        <td id={'files_list_' + idx + '_display_item_size'} className="files-list-path-item files-list-display-size">
          {item_size}
        </td>
      </tr>
    );
  }

  /**
   * Returns the file name of the path (the last path particle)
   * @param {string} path - the path to parse
   * @returns {string|undefined} the last portion of the path when found. Paths terminating in slash return undefined
   */
  getFilename(path) {
    const last_part = path.replaceAll('\\', '/').split('/').pop()

    if (last_part && (last_part.length > 0)) {
      return last_part;
    }

    return undefined;
  }

  /**
   * Normalizes the file and folder entries so that it's easier to manipulate the data
   * @param {Object[]} results - the list of files and folders
   * returns {Object[]} the array of normalized files and folders
   */
  normalizeResults(results) {
    if (results) {
      for (let ii = 0; ii < results.length; ii++) {
        results[ii].lower_name = results[ii].name.toLowerCase();
        results[ii].size = results[ii].size ? parseInt(results[ii].size) : 0;

        if (results[ii].date !== undefined) {
          let cleaned_date = results[ii].date;
          while (cleaned_date.indexOf('  ') !== -1)  {
            cleaned_date.replaceAll('  ',' ');
          }
          results[ii].date = cleaned_date;
        } else {
          results[ii].date = '';
        }
      }
    }
    return results;
  }

  /**
   * Returns the date-based comparison of two entries 
   * @param {Object} first - the first item to compare
   * @param {Object} second - the second item to compare
   * @param {bool} sort_asc - true to compare in ascending order, false to compare in descending order
   * @returns {int} -1, 0, 1 are used to indicate less than, the same, and greater than comparison results
   */
  sortByDate(first, second, sort_asc) {
    // Handle empty dates by putting them at the end
    if (first.date.length <= 0) {
      return second.date.length > 0 ? (sort_asc ? 1 : -1) : 0;
    } else if (second.date.length <= 0) {
      return (sort_asc ? -1 : 1);
    }

    const first_parts = first.date.replace(' ', '-').replace(':', '-').split('-');
    const second_parts = second.date.replace(' ', '-').replace(':', '-').split('-');

    // Return at the first sign of differences
    for (let ii = 0; ii < first_parts.length; ii++) {
      // Proceed with date comparisons
      if (ii < second_parts.length) {
        if (first_parts[ii] < second_parts[ii]) {
          return sort_asc ? -1 : 1;
        } else if (first_parts[ii] > second_parts[ii]) {
          return sort_asc ? 1 : -1;
        }
      } else {
        // For some reason the second date has fewer parts
        return 1;
      }
    }

    // So far the timestamps are equal
    return first_parts === second_parts ? 0 : -1;
  }

  /**
   * Returns the name-based comparison of two entries 
   * @param {Object} first - the first item to compare
   * @param {Object} second - the second item to compare
   * @param {bool} sort_asc - true to compare in ascending order, false to compare in descending order
   * @returns {int} -1, 0, 1 are used to indicate less than, the same, and greater than comparison results
   */
  sortByName(first, second, sort_asc) {
    const lf = first.lower_name;
    const ls = second.lower_name;

    if (lf < ls) {
      return sort_asc ? -1 : 1;
    }
    else if (lf > ls) {
      return sort_asc ? 1 : -1;
    }
    else return 0;
  }

  /**
   * Called to sort normalized results
   * @param {Object[]} results - thee results to sort
   * @param {int} sort_column - the value associated with the column to sort
   * @param {bool} sort_ascending - true indicates an ascending sort, and false a descending sort
   * @returns {Object[]} the sorted results
   */
  sortResults(results, sort_column, sort_ascending) {
    const sort_asc = !(sort_ascending === false);   // Normalize for missing or non-boolean value

    switch (sort_column) {
      default:
      case sort_column_id.name:
        return results.sort((first, second) => this.sortByName(first, second, sort_asc));

      case sort_column_id.size:
        return results.sort((first, second) => this.sortBySize(first, second, sort_asc));

      case sort_column_id.date:
        return results.sort((first, second) => this.sortByDate(first, second, sort_asc));
    } 
  }

  /**
   * Returns the size-based comparison of two entries 
   * @param {Object} first - the first item to compare
   * @param {Object} second - the second item to compare
   * @param {bool} sort_asc - true to compare in ascending order, false to compare in descending order
   * @returns {int} -1, 0, 1 are used to indicate less than, the same, and greater than comparison results
   */
  sortBySize(first, second, sort_asc) {
    // Sort so that folders are at the end, sort folders by name
    if (first.type === 'folder') {
      if (second.type === 'folder') {
        return this.sortByName(first, second, sort_asc);
      } else {
        return sort_asc ? 1 : -1;
      }
    } else if (second.type === 'folder') {
      return sort_asc ? -1 : 1;
    } else {
      if (parseInt(first.size) === parseInt(second.size)) {
        return 0;
      } else if (first.size < second.size) {
        return sort_asc ? -1 : 1;
      } else {
        return sort_asc ? 1 : -1;
      }
    }
  }

  /**
   * Handles the user clicking on a title to sort the contents
   * @param {Object} ev - the triggering event
   * @param {string} title - the title object to sort on
   */
  titleClicked(ev, title) {
    const found_idx = file_display_titles.findIndex((item) => item === title);

    if (found_idx >= 0) {
      if (this.state.sort_column === title_sort_map[found_idx]) {
        const sorted_results = this.sortResults(this.state.path_contents, this.state.sort_column, !this.state.sort_ascending);
        this.setState({sort_ascending: !this.state.sort_ascending, path_contents: sorted_results});
      } else {
        const sorted_results = this.sortResults(this.state.path_contents, title_sort_map[found_idx], true);
        this.setState({sort_column: title_sort_map[found_idx], sort_ascending: true, path_contents: sorted_results})
      }
    }
  }

  /**
   * Returns the sorting indicator for a title
   * @param {string} title - the title object to generate the indicator for
   * @param {bool} sort_asc - truthiness of true returns the ascending sort indicator, otherwise a descending indicator is returned
   */
  titleSortInd(title, sort_asc) {
    const found_idx = file_display_titles.findIndex((item) => item === title);

    if (found_idx >= 0) {
      if (this.state.sort_column === title_sort_map[found_idx]) {
        if (sort_asc) {
          return "\u2227";  // Up caret
        } else {
          return "\u2228";  // Down caret
        }
      }
    }

    return " ";
  }

  /**
   * Returns whether or not the current path is a file and is residing in the starting folder location
   * @returns {bool} true is returned if the file is in the starting folder, false is returned if the current path is not a file or
   * not residing in the starting folder
   */
  fileNotInStartDir() {
    if (this.state.is_file === true && this.state.cur_path.startsWith(this.props.start_path)) {
      var cur_start_path = this.props.start_path;
      if (cur_start_path[cur_start_path.length - 1] !== '/') {
        cur_start_path += '/';
      }
      if (this.state.cur_path.substring(cur_start_path.length).indexOf('/') !== -1) {
        return true;
      }
    }

    return false;
  }

  /**
   * Returns the UI of the folder contents
   */
  render() {
    let parent_el = document.getElementById(this.props.parent_id);
    if (!parent_el) {
      return null;
    }

    var display_style = {};
    const client_rect = parent_el.getBoundingClientRect();

    display_style.left = client_rect.x;
    display_style.top = client_rect.y;
    display_style.width = client_rect.width;
    display_style.height = client_rect.height;

    let folder_navigation = null;
    if ((this.state.is_file === false && this.state.cur_path !== this.props.start_path) || this.fileNotInStartDir()) {
//        (this.state.is_file === true && this.state.cur_path.startsWith(this.props.start_path))) {
      folder_navigation = [{
        name: '..', path: '..', type: 'folder'
      }]
    }

    return (
      <div id="files_list_contents_table_wrapper" className="files-list-contents-table-wrapper">
        <table id="files_list_contents_table" className="files-list-contents-table">
          <thead>
            <tr>
              {file_display_titles.map((title, idx) => {
                  let indicator = this.titleSortInd(title, this.state.sort_ascending);
                  return(<th key={'files_list_contents_table_' + title} className="files-list-contents-table-header">
                      <div id={'files_list_contents_table_title_wrapper_' + title} className="files-list-contents-table-title-wrapper" 
                           onClick={(ev) => this.titleClicked(ev, title)}>
                        <div id={'files_list_contents_table_title_text_' + idx} className="files-list-contents-table-title-text" >{title}</div>
                        <div id={'files_list_contents_table_title_ind_' + idx} 
                             className="files-list-contents-table-title-indicator" >{indicator}</div>
                      </div>
                    </th>
                  );
              })}
            </tr>
          </thead>
          <tbody>
              {folder_navigation && folder_navigation.map(this.displayPathItem)}
              {this.state.path_contents && this.state.path_contents.map(this.displayPathItem)}
          </tbody>
        </table>
      </div>
    );
  }
}

export default AFilesList;
