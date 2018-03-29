/*
This file is part of botten-nappet -- a Twitch bot and streaming tool.
<https://joelpurra.com/projects/botten-nappet/>

Copyright (c) 2018 Joel Purra <https://joelpurra.com/>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

interface INamedWebColor {
    "name": string;
    "rgb": string;
}

// TODO: break out.
// NOTE: extracted from mozilla's web docs.
// TODO: be smart, use a library.
// https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#Color_keywords
// NOTE: inaccurate extraction logic; verify output.
//
// $$("#colors_table tbody tr td[rowspan]")
//  .forEach((tdRowspan) => tdRowspan.parentNode.removeChild(tdRowspan))
//
// $$("#colors_table tbody tr")
//  .map((tr) => ({name: tr.children[1].textContent, rgb: tr.children[2].textContent}))
const namedWebColors: INamedWebColor[] = [
    { name: "black", rgb: "#000000" },
    { name: "silver", rgb: "#c0c0c0" },
    { name: "gray", rgb: "#808080" },
    { name: "white", rgb: "#ffffff" },
    { name: "maroon", rgb: "#800000" },
    { name: "red", rgb: "#ff0000" },
    { name: "purple", rgb: "#800080" },
    { name: "fuchsia", rgb: "#ff00ff" },
    { name: "green", rgb: "#008000" },
    { name: "lime", rgb: "#00ff00" },
    { name: "olive", rgb: "#808000" },
    { name: "yellow", rgb: "#ffff00" },
    { name: "navy", rgb: "#000080" },
    { name: "blue", rgb: "#0000ff" },
    { name: "teal", rgb: "#008080" },
    { name: "aqua", rgb: "#00ffff" },
    { name: "orange", rgb: "#ffa500" },
    { name: "aliceblue", rgb: "#f0f8ff" },
    { name: "antiquewhite", rgb: "#faebd7" },
    { name: "aquamarine", rgb: "#7fffd4" },
    { name: "azure", rgb: "#f0ffff" },
    { name: "beige", rgb: "#f5f5dc" },
    { name: "bisque", rgb: "#ffe4c4" },
    { name: "blanchedalmond", rgb: "#ffebcd" },
    { name: "blueviolet", rgb: "#8a2be2" },
    { name: "brown", rgb: "#a52a2a" },
    { name: "burlywood", rgb: "#deb887" },
    { name: "cadetblue", rgb: "#5f9ea0" },
    { name: "chartreuse", rgb: "#7fff00" },
    { name: "chocolate", rgb: "#d2691e" },
    { name: "coral", rgb: "#ff7f50" },
    { name: "cornflowerblue", rgb: "#6495ed" },
    { name: "cornsilk", rgb: "#fff8dc" },
    { name: "crimson", rgb: "#dc143c" },
    { name: "cyan", rgb: "#00ffff" },
    { name: "darkblue", rgb: "#00008b" },
    { name: "darkcyan", rgb: "#008b8b" },
    { name: "darkgoldenrod", rgb: "#b8860b" },
    { name: "darkgray", rgb: "#a9a9a9" },
    { name: "darkgreen", rgb: "#006400" },
    { name: "darkgrey", rgb: "#a9a9a9" },
    { name: "darkkhaki", rgb: "#bdb76b" },
    { name: "darkmagenta", rgb: "#8b008b" },
    { name: "darkolivegreen", rgb: "#556b2f" },
    { name: "darkorange", rgb: "#ff8c00" },
    { name: "darkorchid", rgb: "#9932cc" },
    { name: "darkred", rgb: "#8b0000" },
    { name: "darksalmon", rgb: "#e9967a" },
    { name: "darkseagreen", rgb: "#8fbc8f" },
    { name: "darkslateblue", rgb: "#483d8b" },
    { name: "darkslategray", rgb: "#2f4f4f" },
    { name: "darkslategrey", rgb: "#2f4f4f" },
    { name: "darkturquoise", rgb: "#00ced1" },
    { name: "darkviolet", rgb: "#9400d3" },
    { name: "deeppink", rgb: "#ff1493" },
    { name: "deepskyblue", rgb: "#00bfff" },
    { name: "dimgray", rgb: "#696969" },
    { name: "dimgrey", rgb: "#696969" },
    { name: "dodgerblue", rgb: "#1e90ff" },
    { name: "firebrick", rgb: "#b22222" },
    { name: "floralwhite", rgb: "#fffaf0" },
    { name: "forestgreen", rgb: "#228b22" },
    { name: "gainsboro", rgb: "#dcdcdc" },
    { name: "ghostwhite", rgb: "#f8f8ff" },
    { name: "gold", rgb: "#ffd700" },
    { name: "goldenrod", rgb: "#daa520" },
    { name: "greenyellow", rgb: "#adff2f" },
    { name: "grey", rgb: "#808080" },
    { name: "honeydew", rgb: "#f0fff0" },
    { name: "hotpink", rgb: "#ff69b4" },
    { name: "indianred", rgb: "#cd5c5c" },
    { name: "indigo", rgb: "#4b0082" },
    { name: "ivory", rgb: "#fffff0" },
    { name: "khaki", rgb: "#f0e68c" },
    { name: "lavender", rgb: "#e6e6fa" },
    { name: "lavenderblush", rgb: "#fff0f5" },
    { name: "lawngreen", rgb: "#7cfc00" },
    { name: "lemonchiffon", rgb: "#fffacd" },
    { name: "lightblue", rgb: "#add8e6" },
    { name: "lightcoral", rgb: "#f08080" },
    { name: "lightcyan", rgb: "#e0ffff" },
    { name: "lightgoldenrodyellow", rgb: "#fafad2" },
    { name: "lightgray", rgb: "#d3d3d3" },
    { name: "lightgreen", rgb: "#90ee90" },
    { name: "lightgrey", rgb: "#d3d3d3" },
    { name: "lightpink", rgb: "#ffb6c1" },
    { name: "lightsalmon", rgb: "#ffa07a" },
    { name: "lightseagreen", rgb: "#20b2aa" },
    { name: "lightskyblue", rgb: "#87cefa" },
    { name: "lightslategray", rgb: "#778899" },
    { name: "lightslategrey", rgb: "#778899" },
    { name: "lightsteelblue", rgb: "#b0c4de" },
    { name: "lightyellow", rgb: "#ffffe0" },
    { name: "limegreen", rgb: "#32cd32" },
    { name: "linen", rgb: "#faf0e6" },
    { name: "magenta", rgb: "#ff00ff" },
    { name: "mediumaquamarine", rgb: "#66cdaa" },
    { name: "mediumblue", rgb: "#0000cd" },
    { name: "mediumorchid", rgb: "#ba55d3" },
    { name: "mediumpurple", rgb: "#9370db" },
    { name: "mediumseagreen", rgb: "#3cb371" },
    { name: "mediumslateblue", rgb: "#7b68ee" },
    { name: "mediumspringgreen", rgb: "#00fa9a" },
    { name: "mediumturquoise", rgb: "#48d1cc" },
    { name: "mediumvioletred", rgb: "#c71585" },
    { name: "midnightblue", rgb: "#191970" },
    { name: "mintcream", rgb: "#f5fffa" },
    { name: "mistyrose", rgb: "#ffe4e1" },
    { name: "moccasin", rgb: "#ffe4b5" },
    { name: "navajowhite", rgb: "#ffdead" },
    { name: "oldlace", rgb: "#fdf5e6" },
    { name: "olivedrab", rgb: "#6b8e23" },
    { name: "orangered", rgb: "#ff4500" },
    { name: "orchid", rgb: "#da70d6" },
    { name: "palegoldenrod", rgb: "#eee8aa" },
    { name: "palegreen", rgb: "#98fb98" },
    { name: "paleturquoise", rgb: "#afeeee" },
    { name: "palevioletred", rgb: "#db7093" },
    { name: "papayawhip", rgb: "#ffefd5" },
    { name: "peachpuff", rgb: "#ffdab9" },
    { name: "peru", rgb: "#cd853f" },
    { name: "pink", rgb: "#ffc0cb" },
    { name: "plum", rgb: "#dda0dd" },
    { name: "powderblue", rgb: "#b0e0e6" },
    { name: "rosybrown", rgb: "#bc8f8f" },
    { name: "royalblue", rgb: "#4169e1" },
    { name: "saddlebrown", rgb: "#8b4513" },
    { name: "salmon", rgb: "#fa8072" },
    { name: "sandybrown", rgb: "#f4a460" },
    { name: "seagreen", rgb: "#2e8b57" },
    { name: "seashell", rgb: "#fff5ee" },
    { name: "sienna", rgb: "#a0522d" },
    { name: "skyblue", rgb: "#87ceeb" },
    { name: "slateblue", rgb: "#6a5acd" },
    { name: "slategray", rgb: "#708090" },
    { name: "slategrey", rgb: "#708090" },
    { name: "snow", rgb: "#fffafa" },
    { name: "springgreen", rgb: "#00ff7f" },
    { name: "steelblue", rgb: "#4682b4" },
    { name: "tan", rgb: "#d2b48c" },
    { name: "thistle", rgb: "#d8bfd8" },
    { name: "tomato", rgb: "#ff6347" },
    { name: "turquoise", rgb: "#40e0d0" },
    { name: "violet", rgb: "#ee82ee" },
    { name: "wheat", rgb: "#f5deb3" },
    { name: "whitesmoke", rgb: "#f5f5f5" },
    { name: "yellowgreen", rgb: "#9acd32" },
    { name: "rebeccapurple", rgb: "#663399" },
];

export const isValidColor = (color: any): boolean => {
    // TODO: tests.

    // NOTE: named web colors according to CSS specification(s).
    if (namedWebColors.some((namedWebColor) => namedWebColor.name === color)) {
        return true;
    }

    // #RGB, #RGBA, #RRGGBB, #RRGGBBAA
    if (/#([a-f0-9]{3}|[a-f0-9]{4}|[a-f0-9]{6}|[a-f0-9]{8})/.test(color)) {
        return true;
    }

    // rgb(rr,gg,bb)
    if (/rgb\((\d{1,3},){2}(\d){1}\)/.test(color)) {
        return true;
    }

    // rgba(rr,gg,bb,a)
    if (/rgba\((\d{1,3},){3}(0|1|0\.\d{1,3})\)/.test(color)) {
        return true;
    }

    // hsl(hh,ss%,ll%)
    if (/hsl\((\d{1,3},){1}((100|\d{1,2})%,){1}((100|\d{1,2})%){1}\)/.test(color)) {
        return true;
    }

    // hsla(hh,ss%,ll%,a)
    if (/hsla\((\d{1,3},){1}((100|\d{1,2})%,){2}(0|1|0\.\d{1,3})\)/.test(color)) {
        return true;
    }

    return false;
};
